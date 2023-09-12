// eslint-disable-next-line
// @ts-nocheck
import gridFormatters from './formatters';
import gridSearch from './search';
import utils from '../../core/utils';

const NULL_RELATED_ROW_ID = '00000000000000000000000000000000';

function gridTemplates(extension) {
	const infernoFlags = utils.infernoFlags;

	const templates = {
		gridHeadTemplate: function (children, style) {
			return Inferno.createVNode(
				Inferno.getFlagsForElementVnode('table'),
				'table',
				'aras-grid-head',
				children,
				infernoFlags.hasNonKeyedChildren,
				{ style: style }
			);
		},
		gridHeadRowTemplate: function (
			children,
			className,
			isKeyedChildren = false
		) {
			return Inferno.createVNode(
				Inferno.getFlagsForElementVnode('tr'),
				'tr',
				className,
				children,
				isKeyedChildren
					? infernoFlags.hasKeyedChildren
					: infernoFlags.hasNonKeyedChildren
			);
		},
		gridHeadCellTemplate: function (children, className, attributes) {
			return Inferno.createVNode(
				Inferno.getFlagsForElementVnode('th'),
				'th',
				'aras-grid-head-cell' + className,
				children,
				infernoFlags.hasNonKeyedChildren,
				attributes
			);
		},
		resizeTemplate: function () {
			return Inferno.createVNode(
				Inferno.getFlagsForElementVnode('div'),
				'div',
				'aras-grid-head-cell-resize'
			);
		},
		labelTemplate: function (children) {
			return Inferno.createVNode(
				Inferno.getFlagsForElementVnode('span'),
				'span',
				'aras-grid-head-cell-label',
				children,
				infernoFlags.hasNonKeyedChildren
			);
		},
		//Modify by tz 2023/6/6 表格列帮助说明功能
		// labelTextTemplate: function (children) {
		// 	return Inferno.createVNode(
		// 		Inferno.getFlagsForElementVnode('span'),
		// 		'span',
		// 		'aras-grid-head-cell-label-text',
		// 		children,
		// 		infernoFlags.hasVNodeChildren
		// 	);
		// },
		labelTextTemplate: function (label, questionMark) {
			let children=[Inferno.createTextVNode(label)];
			if(questionMark){
				children.push(questionMark);
			}
			return Inferno.createVNode(
				Inferno.getFlagsForElementVnode('span'),
				'span',
				'aras-grid-head-cell-label-text',
				children,
				infernoFlags.hasNonKeyedChildren,
				{title: questionMark? null : label}
			);
		},
		//Add by tz 2023/6/6 表格列帮助说明功能
		questionMarkTemplate: function () {
			return Inferno.createVNode(
				Inferno.getFlagsForElementVnode('span'),
				'span',
				'aras-icon-question-mark aras-icon-question-mark_grey'
			);
		},
		sortIconTemplate: function (className, children) {
			return Inferno.createVNode(
				Inferno.getFlagsForElementVnode('span'),
				'span',
				'aras-grid-head-cell-sort aras-icon-long-arrow ' + className,
				children,
				infernoFlags.hasVNodeChildren
			);
		},
		viewportTemplate: function (children, style) {
			return Inferno.createVNode(
				Inferno.getFlagsForElementVnode('table'),
				'table',
				'aras-grid-viewport',
				children,
				infernoFlags.hasNonKeyedChildren,
				{ style: style }
			);
		},
		colgroupTemplate: function (children) {
			return Inferno.createVNode(
				Inferno.getFlagsForElementVnode('colgroup'),
				'colgroup',
				null,
				children,
				infernoFlags.hasNonKeyedChildren
			);
		},
		colTemplate: function (props) {
			return Inferno.createVNode(
				Inferno.getFlagsForElementVnode('col'),
				'col',
				null,
				null,
				infernoFlags.hasInvalidChildren,
				props
			);
		},
		rowTemplate: function (children, className, attrs) {
			return Inferno.createVNode(
				Inferno.getFlagsForElementVnode('tr'),
				'tr',
				className,
				children,
				infernoFlags.hasNonKeyedChildren,
				attrs
			);
		},
		getCellTemplate: function (grid, item, headId, value, rowId) {
			const type = grid._getCellType(headId.id, item.id, value, grid, rowId);
			const cellMetadata = grid.getCellMetadata(headId.id, item.id, type);
			if (cellMetadata) {
				Object.assign(cellMetadata, { rowId });
			}
			const formatter = gridFormatters[type];

			return formatter
				? formatter(headId.id, item.id, value, grid, cellMetadata)
				: {};
		},
		buildCell: function (props) {
			const template = Object.assign(
				{
					tag: 'td',
					children: [props.value]
				},
				props.template
			);

			template.className = props.className + ' ' + (template.className || '');

			return utils.templateToVNode(template);
		},
		getRowClasses: function (grid, row) {
			let classes = 'aras-grid-row';
			if (row.selected) {
				classes += ' aras-grid-row_selected';
			}
			if (row.hovered) {
				classes += ' aras-grid-row_hovered';
			}

			const customClasses = grid.getRowClasses(row.id);
			if (customClasses) {
				classes += ' ' + customClasses;
			}

			return classes;
		},
		buildRow: function (data) {
			const grid = data.grid;

			const cellsVN = data.head.map(function (head) {
				const itemInfo = { ...data.row };
				const currentItem = itemInfo.data;
				const linkProperty = head.data.linkProperty;
				const cellClasses = ['aras-grid-row-cell'];
				if (linkProperty) {
					itemInfo.id = currentItem[linkProperty] || NULL_RELATED_ROW_ID;
					itemInfo.data = grid.rows._store.get(itemInfo.id) || {};
				}
				const rawValue = itemInfo.data[head.data.name || head.id];
				const value =
					rawValue === undefined || rawValue === null ? '' : rawValue;
				const template = templates.getCellTemplate(
					grid,
					itemInfo,
					head,
					value,
					data.row.id
				);
				const cellStyles = grid.getCellStyles(
					head.id,
					itemInfo.id,
					data.row.id
				);
				template.style = templates.mergeCellStyles(
					template,
					head.data,
					cellStyles
				);

				if (typeof template.style !== 'string') {
					template.style = Object.keys(template.style || {}).reduce(function (
						acc,
						style
					) {
						acc += style + ': ' + template.style[style] + ';';
						return acc;
					},
					'');
				}

				return templates.buildCell({
					value: value,
					template: template,
					className: cellClasses.join(' ')
				});
			});
			const attrs = {
				'aria-selected': data.row.selected || null,
				'data-index': data.row.index,
				'data-row-id': data.row.id
			};

			return templates.rowTemplate(
				cellsVN,
				templates.getRowClasses(grid, data.row),
				attrs
			);
		},
		buildViewport: function (rows, head, style, defaults, grid) {
			const columnsVN = head.map(function (head) {
				return templates.colTemplate({
					width: head.data.width || defaults.headWidth
				});
			});

			const rowsVN = rows.map(function (row) {
				return templates.buildRow({
					row: row,
					head: head,
					defaults: defaults,
					grid: grid
				});
			});

			const viewportChildrenVN = [templates.colgroupTemplate(columnsVN)];
			return templates.viewportTemplate(
				viewportChildrenVN.concat(rowsVN),
				style
			);
		},
		buildHead: function (head, headStyle, defaults, grid) {
			const searchVN = [];
			const headVN = head.map(function (head) {
				//Add by tz 2023/6/6 表格列帮助说明功能
				const { questionMark } = head.data;
				const labelChildren = [
					//Modify by tz 2023/6/6 表格列帮助说明功能
					// templates.labelTextTemplate(
					// 	Inferno.createTextVNode(head.data.label || '')
					// )
					templates.labelTextTemplate(
						head.data.label || '',
						questionMark && templates.questionMarkTemplate()
					)
				];
				const icon = head.data.icon;
				const style = {
					width: `${head.data.width || defaults.headWidth}px`
				};
				const attributes = {
					style: style,
					'data-index': head.index,
					'data-head-id': head.id
				};

				if (icon) {
					labelChildren.push(ArasModules.SvgManager.createInfernoVNode(icon));
				}

				if (defaults.sortable) {
					const classNameSort =
						'aras-icon-long-arrow_' +
						(head.sort && head.sort.desc ? 'down' : 'up');
					labelChildren.push(
						templates.sortIconTemplate(
							classNameSort,
							Inferno.createTextVNode(
								head.sort && grid.settings.orderBy.length > 1
									? head.sort.index
									: ''
							)
						)
					);

					let sortAttr = 'none';
					if (head.sort) {
						sortAttr = head.sort.desc ? 'descending' : 'ascending';
					}

					attributes['aria-sort'] = sortAttr;
				}

				const children = [templates.labelTemplate(labelChildren)];

				if (defaults.resizable && head.data.resizable !== false) {
					children.unshift(templates.resizeTemplate());
				}

				if (defaults.search) {
					const search = gridSearch[head.data.searchType || 'text'];
					const cellMetadata = grid.getCellMetadata(
						head.id,
						'searchRow',
						head.data.searchType || 'text'
					);
					const template = search
						? search(
								head.data,
								head.id,
								head.data.searchValue || '',
								grid,
								cellMetadata
						  )
						: {};
					template.key = head.id;
					template.attrs = {
						'data-index': head.index,
						'data-head-id': head.id
					};

					searchVN.push(
						templates.buildCell({
							template: template,
							className: 'aras-grid-search-row-cell'
						})
					);
				}

				const className = head.sort ? ' aras-grid-head-cell_selected' : '';

				return templates.gridHeadCellTemplate(children, className, attributes);
			});

			const headRowsVN = [templates.gridHeadRowTemplate(headVN)];

			if (defaults.search) {
				headRowsVN.push(templates.gridHeadRowTemplate(searchVN, null, true));
			}

			return templates.gridHeadTemplate(headRowsVN, headStyle);
		},
		mergeCellStyles: function (template, head, cellStyles) {
			if (!head.columnCssStyles && !cellStyles) {
				return template.style || {};
			}

			return Object.assign(
				{},
				head.columnCssStyles,
				cellStyles,
				template.style || {}
			);
		}
	};

	if (extension) {
		Object.assign(extension, Object.assign(templates, extension));
	}

	return {
		buildViewport: templates.buildViewport,
		buildHead: templates.buildHead
	};
}

export default gridTemplates;
