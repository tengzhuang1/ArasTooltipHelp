// eslint-disable-next-line
// @ts-nocheck
const dialogTypes = {
	WhereUsed: {
		classList: 'aras-dialog_where-used'
	},
	SearchDialog: {
		classList: 'aras-dialog_search',
		content: 'searchDialog.html',
		title: 'common.select_items'
	},
	ImageBrowser: {
		classList: 'aras-dialog_image-browser',
		content: 'ImageBrowser/imageBrowser.html',
		title: 'image_browser.title'
	},
	HTMLEditorDialog: {
		content: 'HTMLEditorDialog.html',
		size: 'max',
		classList: 'aras-dialog_html-editor'
	},
	RevisionsDialog: {
		classList: 'aras-dialog_revisions',
		title: 'revisiondlg.item_versions',
		content: 'revisionDialog.html'
	},
	ManageFileProperty: {
		title: 'file_management.manage_file_property',
		content: 'manageFileDialog.html',
		classList: 'aras-dialog_manage-file-property'
	},
	Text: {
		title: 'textdialog.title',
		content: 'textDialog.html',
		classList: 'aras-dialog_text'
	},
	Color: {
		title: 'colordialog.title',
		content: 'colorDialog.html',
		classList: 'aras-dialog_color'
	}
};

const htmlHelper = {
	buildTemplate(template, dialog) {
		dialog.innerHTML = template;
		const closeTitle = aras.getResource('', 'common.close');
		const closeButton = dialog.querySelector('.aras-dialog__close-button');
		closeButton.setAttribute('title', closeTitle);
	},
	setTitle(title, dialog) {
		const titleNode = dialog.querySelector(
			'.aras-dialog__title-bar .aras-dialog__title'
		);
		if (titleNode) {
			titleNode.textContent = title || '';
		}
	},
	setUpOptions(options, dialog) {
		if (options) {
			if (options.dialogWidth) {
				dialog.style.width = options.dialogWidth + 'px';
			}
			if (options.dialogHeight) {
				const titleBarHeight = '1rem + 32px';
				dialog.style.height = `calc(${options.dialogHeight}px + ${titleBarHeight})`;
			}
			if (options.classList) {
				dialog.classList.add(options.classList);
			}
		}
	},
	loadContent(type, contentNode, data) {
		if (type === 'iframe') {
			const iframe = document.createElement('iframe');
			iframe.className = 'aras-dialog__iframe';
			iframe.src = data;
			iframe.autofocus = true;
			contentNode.appendChild(iframe);
			contentNode.classList.add('aras-dialog__content-iframe');
		}
	},
	normalizeCoords(block, x, y) {
		const height = block.offsetHeight;
		const width = block.offsetWidth;
		const docWidth = document.documentElement.offsetWidth;
		const docHeight = document.documentElement.offsetHeight;
		let normalizedX = Math.max(x, 0);
		let normalizedY = Math.max(y, 0);

		if (x + width > docWidth) {
			normalizedX = docWidth - width;
		}
		if (y + height > docHeight) {
			normalizedY = docHeight - height;
		}

		return { x: normalizedX, y: normalizedY };
	}
};

const eventsHelper = {
	onMouseDown(dialog, evt) {
		dialog.dialogNode.classList.add('aras-dialog_moving');
		const offsetX = dialog.dialogNode.offsetLeft || 0;
		const offsetY = dialog.dialogNode.offsetTop || 0;
		const downedX = evt.pageX;
		const downedY = evt.pageY;
		const move = (evt) =>
			eventsHelper.onMouseMove(downedX, downedY, dialog, evt);
		const moveup = function (evt) {
			window.removeEventListener('mousemove', move, true);
			dialog.dialogNode.classList.remove('aras-dialog_moving');
			const clientX = offsetX + (evt.pageX - downedX);
			const clientY = offsetY + (evt.pageY - downedY);
			dialog.move(clientX, clientY);
			dialog.dialogNode.style.transform = '';
		};

		window.addEventListener('mousemove', move, true);
		window.addEventListener('mouseup', moveup, { once: true });

		evt.preventDefault();
		return;
	},
	onMouseMove(downedX, downedY, dialog, evt) {
		const calculatedX = parseInt(evt.pageX) - downedX;
		const calculatedY = parseInt(evt.pageY) - downedY;
		dialog.dialogNode.style.transform =
			'translate(' + calculatedX + 'px, ' + calculatedY + 'px)';
	},
	onWindowResize(dialog) {
		if (dialog.dialogNode.classList.contains('aras-dialog_moved')) {
			dialog.move(dialog.dialogNode.offsetLeft, dialog.dialogNode.offsetTop);
		} else {
			const scrollTop =
				document.body.scrollTop || document.documentElement.scrollTop;
			const topValue =
				scrollTop + (window.innerHeight - dialog.dialogNode.offsetHeight) / 2;
			dialog.dialogNode.style.top =
				Math.round(Math.max(scrollTop, topValue)) + 'px';
		}
	},
	attachEvents(dialog) {
		dialog.dialogNode.addEventListener('close', dialog._tryResolveOnClose);
		dialog.attachedEvents.tryResolveOnClose = {
			node: dialog.dialogNode,
			eventName: 'close',
			callback: dialog._tryResolveOnClose
		};

		const onWindowResize = () => eventsHelper.onWindowResize(dialog);
		window.addEventListener('resize', onWindowResize);
		dialog.attachedEvents.onResizeWindow = {
			node: window,
			eventName: 'resize',
			callback: onWindowResize
		};
	},
	detachEvents(dialog) {
		const events = Object.keys(dialog.attachedEvents);
		for (let i = 0; i < events.length; i++) {
			const event = dialog.attachedEvents[events[i]];
			event.node.removeEventListener(event.eventName, event.callback, false);
		}
		dialog.attachedEvents = {};
	}
};

const iframeHelper = {
	setDialogArguments(params, dialog) {
		params.dialog = dialog;
		const iframeNode = dialog.dialogNode.querySelector('.aras-dialog__iframe');
		if (iframeNode) {
			iframeNode.dialogArguments = params;
		}
	}
};

function init(dialogInstance, template, type, args) {
	let dialogType = {};
	if (args.type && dialogTypes[args.type]) {
		dialogType = Object.assign(dialogType, dialogTypes[args.type]);
		args.classList = dialogType.classList;
	}
	const dialog = document.createElement('dialog');
	dialog.classList.add('aras-dialog');
	htmlHelper.buildTemplate(template, dialog);

	dialogInstance.contentNode = dialog.querySelector('.aras-dialog__content');

	htmlHelper.setTitle(
		args.title ||
			(dialogType.title ? aras.getResource('', dialogType.title) : ''),
		dialog
	);
	htmlHelper.loadContent(
		type,
		dialogInstance.contentNode,
		dialogType.content || args.content
	);

	htmlHelper.setUpOptions(args, dialog);

	if (!dialog.showModal) {
		dialogPolyfill.registerDialog(dialog);
	}
	document.body.appendChild(dialog);

	dialogInstance.dialogNode = dialog;
	dialogInstance.promise = new Promise(function (resolve) {
		dialogInstance._tryResolveOnClose = function () {
			let returnValue = dialogInstance.returnValue;
			if (type === 'iframe') {
				const iframe = dialogInstance.dialogNode.querySelector(
					'.aras-dialog__iframe'
				);
				// it's required to make event "beforeunload" to be dispatched
				iframe.src = 'about:blank';

				if (returnValue === undefined && iframe.contentWindow?.returnValue) {
					returnValue = iframe.contentWindow.returnValue;
				}
			}
			eventsHelper.detachEvents(dialogInstance);
			dialog.parentNode.removeChild(dialog);
			resolve(returnValue);
		};
	});

	eventsHelper.attachEvents(dialogInstance);
	iframeHelper.setDialogArguments(args, dialogInstance);
}

class Dialog {
	promise = null;
	dialogNode = null;
	//Modify by tz 2023/5/30 窗体控件帮助说明功能
	//contentNode = null;
	contentNode:any = null;
	attachedEvents = {};
	type;
	template =
		'<div class="aras-dialog__title-bar">' +
		'<span class="aras-dialog__close-button aras-icon-close"></span>' +
		'<span class="aras-dialog__title"></span>' +
		'</div>' +
		'<div class="aras-dialog__content">' +
		'</div>';

	constructor(type, args) {
		this.type = type;
		this.init(this.template, args);
	}

	init(template, args) {
		init(this, template, this.type, args);
		this.makeMove();
		this.makeClose();
	}

	makeMove() {
		const onMouseDownBinded = (evt) => eventsHelper.onMouseDown(this, evt);
		this.dialogNode
			.querySelector('.aras-dialog__title-bar .aras-dialog__title')
			.addEventListener('mousedown', onMouseDownBinded, true);
		this.attachedEvents.dragAndDrop = {
			node: this.dialogNode.querySelector(
				'.aras-dialog__title-bar .aras-dialog__title'
			),
			eventName: 'mousedown',
			callback: onMouseDownBinded
		};
	}

	makeClose() {
		const onCloseButtonBinded = this.close.bind(this, undefined);
		this.dialogNode
			.querySelector('.aras-dialog__title-bar .aras-dialog__close-button')
			.addEventListener('click', onCloseButtonBinded);
		this.attachedEvents.onCloseBtn = {
			node: this.dialogNode.querySelector(
				'.aras-dialog__title-bar .aras-dialog__close-button'
			),
			eventName: 'click',
			callback: onCloseButtonBinded
		};
	}

	makeAutoresize() {
		// The window could be resize only if open throught window.open
		if (!window.opener) {
			return;
		}
		const oldBox = { w: window.outerWidth, h: window.outerHeight };
		const deltaWidth = 40;
		const deltaHeight = 45; // this deltas are used for detect a necessity to resize the parent window of the dialog
		const oldBoxWidthRatio = oldBox.w;
		const oldBoxHeightRation = oldBox.h;

		// trick for calculating dialog sizes because
		// when max-height or max-width less than original sizes
		// so to get it is not possible
		this.dialogNode.style.maxWidth = 'none';
		this.dialogNode.style.maxHeight = 'none';

		const widthWithDelta = this.dialogNode.offsetWidth + deltaWidth;
		const heightWithDelta = this.dialogNode.offsetHeight + deltaHeight;
		this.dialogNode.style.maxWidth = '100%';
		this.dialogNode.style.maxHeight = '100%';

		if (
			oldBoxWidthRatio < widthWithDelta ||
			oldBoxHeightRation < heightWithDelta
		) {
			const newHeight = Math.max(oldBoxHeightRation, heightWithDelta);
			const newWidth = Math.max(oldBoxWidthRatio, widthWithDelta);
			window.resizeTo(newWidth, newHeight);
			this.promise.then(() => {
				// Resize callback for promise which does not allow to correctly define the next chain parts.
				// This is related with browser performance for async operations
				setTimeout(() => window.resizeTo(oldBox.w, oldBox.h), 0);
			});
		}
	}

	show() {
		if (this.dialogNode.style.display !== 'none') {
			this.dialogNode.showModal();
		}
		this.dialogNode.style.display = '';
		this.makeAutoresize();
	}

	hide() {
		this.dialogNode.style.display = 'none';
	}

	close(data) {
		if (this.dialogNode && this.dialogNode.hasAttribute('open')) {
			this.returnValue = data;
			this.dialogNode.close();
		}
	}

	move(left, top) {
		const normalized = htmlHelper.normalizeCoords(this.dialogNode, left, top);
		this.dialogNode.style.left = normalized.x + 'px';
		this.dialogNode.style.top = normalized.y + 'px';
		if (!this.dialogNode.classList.contains('aras-dialog_moved')) {
			this.dialogNode.classList.add('aras-dialog_moved');
		}
	}

	setTitle(title) {
		htmlHelper.setTitle(title, this.dialogNode);
	}

	resizeContent(width, height) {
		const titleHeight = this.dialogNode.firstChild.offsetHeight;
		this.resize(width, height + titleHeight);
	}

	resize(width, height) {
		this.dialogNode.style.width = width + 'px';
		this.dialogNode.style.height = height + 'px';
		this.makeAutoresize();
		eventsHelper.onWindowResize(this);
	}

	static show(type, args) {
		const dialog = new Dialog(type, args);
		dialog.show();
		return dialog;
	}
}

export default Dialog;
