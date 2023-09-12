// eslint-disable-next-line
// @ts-nocheck
import { adaptGridHeader } from './adaptGridHeader';
import parseCssString from './parseCssString';
import { itemType as itemTypeMetadata, propertyEvents } from 'metadata';
import alert from '../../components/alert';
import type { GridPlugin } from './pluginTypes';
import dialogs from './dialogs';
import BaseGridPlugin from './BaseGridPlugin';

export default class ItemTypeGridPlugin
	extends BaseGridPlugin
	implements GridPlugin
{
	dialogTypes = ['text', 'color', 'image', 'formatted text'];
	events = [
		{
			type: 'click',
			element: 'cell',
			name: 'gridLink',
			method(payload) {
				const [headId, rowId, event] = payload.data;
				this.gridLinkClick(headId, rowId, event);
			}
		},
		{
			type: 'dblclick',
			element: 'cell',
			name: 'onRowDblClick',
			async method(payload) {
				const [, rowId, event] = payload.data;
				const metaKeyPressed = event.ctrlKey || event.metaKey;
				const item = this.grid.rows.get(rowId);
				const { itemType, location } = this.options.getLayoutOptions();
				const commandOptions = {
					item,
					itemType,
					location,
					background: metaKeyPressed
				};
				this.openItem(commandOptions);
			}
		},
		{
			type: 'focusCell',
			name: 'onFocusSearchCell',
			method(payload) {
				const [event] = payload.data;

				if (this._oldSearchHeadId) {
					const rowId = 'input_row';
					const field = this._oldSearchHeadId;
					this._oldSearchHeadId = null;

					this.resetFilterListValueIfNeed(field);
					window.applyCellEditCommon.call(
						this.options.gridWrapper,
						rowId,
						field
					);
				}

				const { detail } = event;
				if (detail && detail.rowId === 'searchRow') {
					this._oldSearchHeadId = detail.headId;
				}
			}
		},
		{
			type: 'selectRow',
			name: 'selectRow',
			method() {
				const actions = this.options.getActions();
				const selectedRows = this.grid.settings.selectedRows;
				actions.updateSelectedRows(selectedRows);
			}
		},
		{
			type: 'freezeColumns',
			name: 'updateFreezeColumnsHandler',
			method(payload) {
				const [event] = payload.data;
				const { updateLayoutData } = this.options.getActions();
				updateLayoutData({
					grid: {
						frozenColumns: event.detail.frozenColumns
					}
				});
			}
		},
		{
			type: 'moveHead',
			name: 'updateColumnsOrderHandler',
			method() {
				const { updateLayoutData } = this.options.getActions();
				updateLayoutData({
					grid: {
						order: [...this.grid.settings.indexHead]
					}
				});
			}
		},
		{
			type: 'resizeHead',
			name: 'updateColumnWidthHandler',
			method(payload) {
				const [event] = payload.data;
				const { updateLayoutData } = this.options.getActions();
				const columnName = this.grid.settings.indexHead[event.detail.index];
				const width = this.grid.head.get(columnName, 'width');

				updateLayoutData({
					grid: {
						widths: new Map([[columnName, width]])
					}
				});
			}
		}
	];
	async initItemTypeData() {
		this.options.itemType = await itemTypeMetadata.getItemType(
			this.options.itemTypeId,
			'id'
		);
		if (this.options.gridWrapper) {
			this.options.gridWrapper._itemType = this.options.itemType;
		}
	}

	async init() {
		await this.initGridHeader();

		this.grid.rows = new Map();
		this.grid.settings.indexRows = [];
		this.grid.settings.selectedRows = [];

		this.grid.on('keydown', this.getKeyDownHandler(), 'cell');
		await this.initItemTypeData();
		this.cachedRowStyles = new Map();
		this.currentUserId = aras.getCurrentUserID();
		this.languages = aras
			.getLanguagesResultNd()
			.selectNodes('Item[@type="Language"]');

		//Add by tz 2023/6/6 表格列帮助说明功能
		this.grid.on('mouseover', this.#showGridHeadTooltip.bind(this), 'head');
	}

	async initGridHeader() {
		this.gridHeaderInfo = await this.adaptHeader();
		const { columnsOrder, headMap, indexHead, orderBy } = this.gridHeaderInfo;
		this.grid.head = headMap;
		this.grid.settings.indexHead = indexHead;
		this.grid.settings.orderBy = orderBy;
		if (this.options.gridWrapper) {
			this.options.gridWrapper.grid_Experimental.order = columnsOrder;
		}
	}

	async adaptHeader() {
		return await adaptGridHeader(
			this.options.itemTypeId,
			this.options.userPreferences
		);
	}

	resetFilterListValueIfNeed(changedCellHeadId) {
		const grid = this.options.gridWrapper;
		const { head, settings } = this.grid;
		const visibleColumns = settings.indexHead;
		const changedPropertyName = head.get(changedCellHeadId, 'name');

		for (const headId of visibleColumns) {
			const propertyPattern = head.get(headId, 'pattern');
			if (propertyPattern !== changedPropertyName) {
				continue;
			}

			const columnIndex = grid.getColumnIndex(changedCellHeadId);
			const propXpath =
				window.searchContainer.getPropertyXPathByColumnIndex(columnIndex);
			const searchProperty =
				window.currentSearchMode.currQryItem.dom.selectSingleNode(propXpath);
			const previousSearchValue = searchProperty?.text || '';
			const currentSearchValue =
				head.get(changedCellHeadId, 'searchValue') || '';
			if (previousSearchValue === currentSearchValue) {
				continue;
			}

			head.set(headId, '', 'searchValue');
			window.applyCellEditCommon.call(grid, 'input_row', headId);
		}
	}

	isCellReadOnly(headId: string, itemId: string): boolean {
		const { head } = this.grid;

		const isReadOnly = head.get(headId, 'isReadOnly');
		const propertyName = head.get(headId, 'name');
		const isXproperty = itemTypeMetadata.isXproperty(propertyName);
		const isForeign = head.get(headId, 'isForeign');
		const isSequence = head.get(headId, 'dataType') === 'sequence';
		const isRestricted = this.isPropertyRestricted(itemId, headId);

		return isReadOnly || isXproperty || isForeign || isSequence || isRestricted;
	}

	isPropertyRestricted(itemId, headId) {
		const { head, rows } = this.grid;
		const propertyName = head.get(headId, 'name') || headId;
		return rows.get(itemId, `${propertyName}@aras.restricted`);
	}

	getCellType(result, headId, itemId) {
		if (headId !== 'L' && this.isPropertyRestricted(itemId, headId)) {
			return 'restricted';
		}

		return this.grid.head.get(headId, 'dataType');
	}

	getEditorType(result, headId) {
		const dataType = this.grid.head.get(headId, 'dataType');
		if (this.dialogTypes.includes(dataType)) {
			return 'nonEditable';
		}

		return result;
	}

	customStyles = {
		regularCell: {
			'background-color': 'transparent'
		}
	};

	getCustomStyles(headId, itemId, rowStyles) {
		const { head } = this.grid;
		const propertyName = head.get(headId, 'name') || headId;
		const rowStyle = rowStyles.get(propertyName) || {};

		const state = this.options.getState();
		const isEditState = state.editableItems.has(itemId);

		if (!isEditState) {
			return rowStyle;
		}

		const isSetBackgroundColor = rowStyle['background-color'];
		const readOnly = this.isCellReadOnly(headId, itemId);
		if (readOnly || isSetBackgroundColor) {
			return rowStyle;
		}

		return { ...rowStyle, ...this.customStyles.regularCell };
	}

	getCellStyles(result, headId, itemId, rowId) {
		const { rows } = this.grid;
		const styleString =
			(rows.get(itemId, 'fed_css') || '') + (rows.get(itemId, 'css') || '');
		const rowStyles =
			this.cachedRowStyles.get(styleString) || parseCssString(styleString);
		this.cachedRowStyles.set(styleString, rowStyles);

		return this.getCustomStyles(headId, itemId, rowStyles, rowId);
	}

	getFilteredList(headId, list) {
		const { head, settings } = this.grid;
		const propertyName = head.get(headId, 'pattern');
		const propertyColumnName = settings.indexHead.find((columnName) =>
			columnName.startsWith(propertyName)
		);
		const filterValue = head.get(propertyColumnName, 'searchValue') || '';
		this.resetFilterListValueIfNeed(propertyColumnName);
		if (filterValue) {
			return list.filter((option) => option.filter === filterValue);
		}

		return list;
	}

	getMetadataHeadList(headInfo, type) {
		const { metadata } = this.gridHeaderInfo;
		let list = metadata.headLists[headInfo.dataSource] || [];
		if (type === 'classification') {
			list = metadata.classStructure.get(metadata.itemTypeName);
		}
		return list;
	}

	getCellMetadata(result, headId, itemId, type) {
		const { head, rows, settings } = this.grid;
		const { gridWrapper, getProps, getState } = this.options;
		const headInfo = head._store.get(headId);
		const defaultPattern = type === 'date' ? 'short_date' : '';
		const pattern = headInfo.pattern || defaultPattern;
		let metadataList = this.getMetadataHeadList(headInfo, type);
		if (itemId === 'searchRow' && headInfo.dataType === 'filter list') {
			metadataList = this.getFilteredList(headId, metadataList);
		}
		return {
			list: metadataList,
			lifeCycleStates: this.gridHeaderInfo.metadata.lifeCycleStates,
			currentUserId: this.currentUserId,
			format: itemId === 'searchRow' ? defaultPattern : pattern,
			sourceItemTypeName: headInfo.dataSourceName,
			scale: headInfo.scale,
			precision: headInfo.precision,
			maxLength: headInfo.maxLength,
			propsOfLayout: getProps(),
			stateOfLayout: getState(),
			itemType: this.getItemType(headId),
			languages: this.languages,
			loadFileHandler: async () => {
				const parentRowId = settings.focusedCell.rowId;
				const file = await aras.vault.selectFile();
				const gridComponent = this.grid;
				const validationResult = gridComponent.validateCell(
					headId,
					parentRowId,
					file,
					gridComponent
				);
				if (validationResult.valid === false) {
					gridComponent.settings.focusedCell = { headId, parentRowId };
					alert(validationResult.validationMessage);
					return;
				}
				const selectedFile = aras.newItem('File', file);

				if (selectedFile) {
					aras.itemsCache.addItem(selectedFile);

					const cellName = head.get(headId, 'name');
					const itemFileJson = ArasModules.xmlToODataJson(selectedFile);
					const currentRow = rows._store.get(itemId);

					currentRow[cellName] = itemFileJson.id;
					currentRow[cellName + '@aras.action'] = itemFileJson['@aras.action'];
					currentRow[cellName + '@aras.keyed_name'] = itemFileJson.filename;

					rows._store.set(itemId, currentRow);

					window.onWidgetApplyEdit(parentRowId, headId, selectedFile);
				}
			},
			editorClickHandler: () => {
				const rowId = settings.focusedCell.rowId;
				gridWrapper._grid.cancelEdit();
				gridWrapper.onInputHelperShow_Experimental(rowId, headInfo.layoutIndex);
			},
			handler: () => {
				gridWrapper.onInputHelperShow_Experimental(
					itemId,
					headInfo.layoutIndex
				);
			}
		};
	}

	getFileEditAvailability(rowId) {
		const layoutState = this.options.getState();
		const isEditableCell = layoutState.editableItems.has(rowId);

		return isEditableCell;
	}

	checkEditAvailability(result, headId, rowId) {
		const { head, rows } = this.grid;

		if (head.get(headId, 'dataType') === 'file') {
			return this.getFileEditAvailability(rowId, headId);
		}

		const propertyName = head.get(headId, 'name');
		const isXproperty = itemTypeMetadata.isXproperty(propertyName);

		if (isXproperty) {
			return false;
		}

		if (
			headId === 'L' ||
			head.get(headId, 'isForeign') ||
			head.get(headId, 'isReadOnly') ||
			this.isPropertyRestricted(rowId, headId)
		) {
			return false;
		}

		const itemAction = rows.get(rowId, '@aras.action');
		if (itemAction === 'delete' || itemAction === 'purge') {
			return false;
		}

		return true;
	}

	getRowDataId(rowId) {
		return rowId;
	}

	getKeyDownHandler() {
		return async (headId, rowId, event) => {
			const dataType = this.grid.head.get(headId, 'dataType');
			const availabelKey = ['F2', 'Enter', 'NumpadEnter'];

			if (dataType !== 'file' || !availabelKey.includes(event.code)) {
				return;
			}

			const metadata = this.grid.getCellMetadata(headId, rowId);
			const propName = this.grid.head.get(headId, 'name');
			const dataId = this.getRowDataId(rowId, headId);
			const fileId = this.grid.rows.get(dataId, propName);

			if (!fileId) {
				metadata.loadFileHandler();
				return;
			}

			switch (event.code) {
				case 'F2': {
					const itemId = this.grid.rows.get(rowId, 'id');
					await dialogs.file(headId, rowId, itemId, this.grid, { fileId });
					break;
				}
				case 'Enter':
				case 'NumpadEnter': {
					const rowInfo = this.grid.rows.get(rowId);
					const isAdd = rowInfo[`${propName}@aras.action`] === 'add';
					if (fileId && !isAdd) {
						const dataSourceName = this.grid.head.get(headId, 'dataSourceName');
						const itemTypeName =
							dataSourceName || rowInfo[`${propName}@aras.type`];
						const itemType = await itemTypeMetadata.getItemType(itemTypeName);
						const item = {
							id: fileId
						};
						const { location } = this.options.getLayoutOptions();

						const commandOptions = {
							itemType,
							itemTypeName,
							location,
							item
						};
						this.openItem(commandOptions);
					}
					break;
				}
			}
		};
	}

	async gridLinkClick(headId, rowId, event) {
		const { rows, head } = this.grid;
		let rowInfo = rows.get(rowId);
		const headInfo = head.get(headId);
		if (headInfo.linkProperty) {
			rowInfo = rows.get(rowInfo[headInfo.linkProperty]) || {};
		}
		const propertyName = headInfo.name || headId;
		const dataSourceName = headInfo.dataSourceName;
		const sourceItemTypeName =
			dataSourceName || rowInfo[propertyName + '@aras.type'];
		let action = rowInfo.id || rowInfo.uniqueId;
		let link = '';
		const currentProperty = rowInfo[propertyName];
		if (
			currentProperty &&
			rowInfo[propertyName + '@aras.discover_only'] !== '1'
		) {
			const isFile = dataSourceName === 'File';
			const typeOfLists = ['list', 'filter list', 'color list', 'mv_list'];

			if (typeOfLists.includes(headInfo.dataType)) {
				link = "'List',";
			} else if (headInfo.dataType === 'sequence') {
				link = "'Sequence',";
			} else {
				link = "'" + sourceItemTypeName + "',";
			}

			action = isFile ? rowInfo[propertyName + '@aras.action'] : action;
			link += "'" + currentProperty + "'";
		}

		if (
			event.target.classList &&
			event.target.classList.contains('aras-grid-link') &&
			action !== 'add'
		) {
			const itemType = await itemTypeMetadata.getItemType(sourceItemTypeName);
			const { location } = this.options.getLayoutOptions();
			const item = {
				id: currentProperty
			};
			const metaKeyPressed = event.ctrlKey || event.metaKey;
			const commandOptions = {
				itemType,
				itemTypeName: sourceItemTypeName,
				location,
				item,
				background: metaKeyPressed
			};
			this.openItem(commandOptions);
		}
		if (
			event.target.closest('.aras-grid-file-icon') &&
			!event.target.closest('.aras-grid-file-icon_select-file')
		) {
			const itemId = rowInfo.id;
			const fileId = link.replace(/'/g, '').split(',')[1];
			dialogs.file(headId, rowId, itemId, this.grid, { fileId });
		}
	}

	async sort() {
		const { head, rows, settings } = this.grid;
		if (window.aras.getVariable('SortPages') === 'true') {
			const currentSearchMode = window.currentSearchMode;
			// set new orderBy statement into currentSearchMode
			// to synchronize ordering of search item with grid ordering
			currentSearchMode.setSortOrderByGridInfo(head, settings.orderBy);

			// run search
			// search results will be output to grid with correct ordering
			currentSearchMode.searchContainer.runSearch();

			return;
		}

		const indexRowsOfNewItems = [];
		const indexRowsOfNotNewItems = [];
		settings.indexRows.forEach((rowId) => {
			const isNewItem = rows.get(rowId, '@aras.action') === 'add';
			if (isNewItem) {
				indexRowsOfNewItems.push(rowId);
			} else {
				indexRowsOfNotNewItems.push(rowId);
			}
		});

		this.grid.clientSort(indexRowsOfNewItems);
		this.grid.clientSort(indexRowsOfNotNewItems);
		settings.indexRows = [...indexRowsOfNotNewItems, ...indexRowsOfNewItems];
	}

	getItemType() {
		return this.options.itemType;
	}

	validateCell(result, headId, rowId, value, grid) {
		const dataType = this.grid.head.get(headId, 'dataType');
		if (dataType === 'item' && typeof value === 'string') {
			const dataSourceName = this.grid.head.get(headId, 'dataSourceName');
			const itemNode = aras.uiGetItemByKeyedName(dataSourceName, value, true);
			value = itemNode
				? {
						id: itemNode.getAttribute('id'),
						type: dataSourceName,
						keyedName: value
				  }
				: null;
		}

		const itemId = this.getRowDataId(rowId, headId);
		const { name } = grid.head.get(headId);
		let itemType = this.getItemType(headId);

		const isPolymorphic = itemTypeMetadata.isPolymorphic(itemType);
		if (isPolymorphic) {
			const { polySources } = this.options.getLayoutOptions();

			const itemTypeId = grid.rows.get(itemId, 'itemtype');
			itemType = Object.values(polySources).find(
				(item) => item.id === itemTypeId
			);
		}

		const checkResult = propertyEvents.validate(itemId, name, value, itemType);
		if (checkResult.valid === false) {
			return checkResult;
		}

		return {
			valid: true,
			value: checkResult.value || value
		};
	}

	async openItem(commandOptions) {
		const { commandFactory } = this.options.getLayoutOptions();
		const openItemCommand = commandFactory('OpenItem', commandOptions);

		try {
			await openItemCommand.execute();
		} catch ({ message }) {
			const win = aras.getMostTopWindowWithAras();
			win.ArasModules.Dialog.alert(message, { type: 'error' });
		}
	}

	//Add by tz 2023/6/6 表格列帮助说明功能
	#showGridHeadTooltip(headId: string, e: MouseEvent) {
		const questionMark = this.grid.head.get(headId, 'questionMark');
		let { target } = e;

		if (!target || !questionMark || this.currentHoveredElement === headId) {
			return;
		}

		if (!target.classList.contains('aras-grid-head-cell')) {
			target = target.closest('.aras-grid-head-cell');
		}

		this.currentHoveredElement = headId;

		const { helpTooltip, helpText, label } = this.grid.head.get(headId);

		target.dispatchEvent(
			new CustomEvent('showTooltip', {
				bubbles: true,
				detail: {
					title: label || '',
					extendHelpInfo: helpText,
					helpText: helpTooltip,
					position: 'bottom'
				}
			})
		);

		target.addEventListener(
			'mouseleave',
			() => {
				this.currentHoveredElement = null;
			},
			{ once: true }
		);
	}
}
