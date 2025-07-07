export async function _onDrop(event) {
    if ( !this.canUpload ) return;
    const form = event.currentTarget.closest("form");
    form.disabled = true;
    const target = form.target.value;

    
    // Process the data transfer
    const data = TextEditor.getDragEventData(event);
    if ( !event.dataTransfer.items || !event.dataTransfer.items.length || data.fromFilePicker ) return;
    
    const fileProcessor = new FileProcessor(event.dataTransfer.items, this, target, form);

    await fileProcessor.loadData();

    let dialogResult = "files";

    if (fileProcessor.hasDirectories) {
        dialogResult = await new Promise((resolve, reject) => {
            new Dialog({
                title: "Filepicker+ - Advanced File Upload",
                content: "Detected one or more folders in the upload. Do you want to upload only the contents or the entire folder structure?" + "<hr>",
                buttons: {
                    folders: {
                        icon: '<i class="fa-solid fa-folder-tree"></i>',
                        label: "Upload Folder Tree",
                        callback: () => resolve("folders")
                    },
                    files: {
                        icon: '<i class="fa-solid fa-files"></i>',
                        label: "Upload Contents Only",
                        callback: () => resolve("files")
                    },
                },
                default: "folders",
                close: () => resolve(false)
            }).render(true);
        });
    }

    if (dialogResult) {
        await fileProcessor.processFiles(dialogResult === "files");
    }


    // Re-enable the form
    form.disabled = false;
    return this.browse(target);
}



class FileProcessor{
    constructor (dataTransferItems, filePicker, target, form) {
        this.dataTransferItems = dataTransferItems;
        this.filePicker = filePicker;
        this.target = target;
        this.form = form;
    }

    get bucket() {
        return this.form.bucket ? this.form.bucket.value : null
    }

    async loadData() {
        this.data = await this.getFilesDataTransferItems(this.dataTransferItems);
        this.hasDirectories = this.data.some(f => f.subfolder);
    }

    async processFiles(filesOnly) {
        if (filesOnly) this.data = this.getFilesOnly(this.data);
        await this.uploadRecursive(this.data, this.target.endsWith("/") ? this.target : this.target + "/");
    }



    async uploadRecursive(data, target) {
        for (const item of data) {
            if (item instanceof File) {
                await this.uploadFile(item, target);
            } else if(item.subfolder) {
                const newTarget = (target ? target + item.name : item.name) + "/";
                const currentDir = await FilePicker.browse(this.filePicker.activeSource, target, {bucket: this.bucket});
                if(!currentDir?.dirs?.includes(item.name)) await FilePicker.createDirectory(this.filePicker.activeSource, newTarget, {bucket: this.bucket});
                await this.uploadRecursive(item.subfolder, newTarget);
            }
        }
    }

    async uploadFile(file, target) {
        const name = file.name.toLowerCase();
        if ( !this.filePicker.extensions.some(ext => name.endsWith(ext)) ) {
          ui.notifications.error(`Incorrect ${this.filePicker.type} file extension. Supports ${this.filePicker.extensions.join(" ")}.`);
          return;
        }
        const response = await this.filePicker.constructor.upload(this.filePicker.activeSource, target, file, {
          bucket: this.form.bucket ? this.form.bucket.value : null
        });
        if ( response ) this.filePicker.request = response.path;
    }

    getFilesOnly(files) {
        const rawFiles = [];
        function traverseSubfolders(f) {
            if (f.subfolder) {
                for (let i = 0; i < f.subfolder.length; i++) {
                    traverseSubfolders(f.subfolder[i]);
                }
            } else {
                if(f instanceof File) rawFiles.push(f);
            }
        }
        for (let i = 0; i < files.length; i++) {
            traverseSubfolders(files[i]);
        }
        return rawFiles;
    }

    getFilesDataTransferItems(dataTransferItems, filesOnly = false) {
        function traverseFileTreePromise(item, path = "", folder) {
          return new Promise(resolve => {
            if (item.isFile) {
              item.file(file => {
                file.filepath = path || "" + file.name; //save full path
                folder.push(file);
                resolve(file);
              });
            } else if (item.isDirectory) {
              let dirReader = item.createReader();
              dirReader.readEntries(entries => {
                let entriesPromises = [];
                let subfolder = [];
                folder.push({ name: item.name, subfolder: subfolder });
                for (let entr of entries)
                  entriesPromises.push(
                    traverseFileTreePromise(entr, path || ""  + item.name + "/", subfolder)
                  );
                resolve(Promise.all(entriesPromises));
              });
            }
          });
        }
      
        let files = [];
        return new Promise((resolve, reject) => {
          let entriesPromises = [];
          for (let it of dataTransferItems)
            entriesPromises.push(
              traverseFileTreePromise(it.webkitGetAsEntry(), null, files)
            );
            Promise.all(entriesPromises).then(entries => {
                resolve(files);
          });
        });
    }
}




