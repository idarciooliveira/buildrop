declare module 'dropzone' {
	interface DropzoneOptions {
		url: string;
		autoProcessQueue?: boolean;
		clickable?: boolean;
		maxFiles?: number;
		parallelUploads?: number;
		acceptedFiles?: string;
		createImageThumbnails?: boolean;
		previewsContainer?: false | string | HTMLElement;
		addRemoveLinks?: boolean;
		dictInvalidFileType?: string;
		dictDefaultMessage?: string;
	}

	export class Dropzone {
		constructor(element: string | HTMLElement, options?: DropzoneOptions);
		files: File[];
		on(event: 'addedfile', callback: (file: File) => void): this;
		on(event: 'maxfilesexceeded', callback: (file: File) => void): this;
		on(event: 'removedfile', callback: () => void): this;
		on(event: 'error', callback: (file: File, message: string | Error) => void): this;
		on(event: string, callback: (...args: unknown[]) => void): this;
		addFile(file: File): void;
		removeAllFiles(cancelIfNecessary?: boolean): void;
		getAcceptedFiles(): File[];
	}
}
