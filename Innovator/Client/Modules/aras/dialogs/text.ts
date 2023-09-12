import { wire, bind } from 'hyperhtml';
import Dialog from '../../core/Dialog';
import getResource from '../../core/resources';

interface TextDialogOptions {
	title?: string;
}

function text(text: string, options: TextDialogOptions = {}) {
	const defaultTitle = getResource('textdialog.title');
	const { title = defaultTitle } = options;
	const cssClassName = 'aras-dialog__text';
	const textDialog = new Dialog('html', {
		classList: cssClassName,
		title
	});

	const textNode = wire()`<div class="${cssClassName}-data">${text}</div>`;

	bind(textDialog.contentNode)`
		${textNode}
	`;

	textDialog.show();
	return textDialog.promise;
}

export default text;
