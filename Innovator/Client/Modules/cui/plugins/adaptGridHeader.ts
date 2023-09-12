// eslint-disable-next-line
// @ts-nocheck
import getResource from '../../core/resources';
import { itemType as itemTypeMetadata } from 'metadata';

const icons = {
	claimAnyone: '../images/ClaimAnyone.svg',
	claimColumn: '../images/ClaimColumn.svg',
	claimOn: '../images/ClaimOn.svg',
	claimOther: '../images/ClaimOther.svg'
};

ArasModules.SvgManager.enqueue(Object.values(icons));

const DEFAULT_COLUMN_WIDTH = 100;
const listSet = new Set(['list', 'filter list', 'color list', 'mv_list']);
const labelWithPostfixTypes = [
	'date',
	'text',
	'image',
	'formatted text',
	'color'
];

export async function adaptRelationshipGridHeader(
	relationshipItemTypeId,
	userPreferences,
	relatedItemTypeId,
	gridView
) {
	const gridColumsInfoByRelatedPromise = getGridHeaderInfoByItemType(
		relatedItemTypeId,
		{
			criteria: 'is_hidden2',
			postfix: '_R'
		}
	);

	const gridColumsInfoByRelationshipPromise = getGridHeaderInfoByItemType(
		relationshipItemTypeId,
		{
			criteria: 'is_hidden2',
			postfix: '_D'
		}
	);

	const [headInfoByRelationshipProperties, headInfoByRelatedProperties] =
		await Promise.all([
			gridColumsInfoByRelationshipPromise,
			gridColumsInfoByRelatedPromise
		]);

	let infoByItemType = headInfoByRelationshipProperties || {
		headMap: new Map(),
		columnsOrder: [],
		orderBy: []
	};
	if (headInfoByRelatedProperties) {
		headInfoByRelatedProperties.headMap.forEach((head) => {
			head.linkProperty = 'related_id';
		});

		infoByItemType = {
			headMap: new Map([
				...infoByItemType.headMap,
				...headInfoByRelatedProperties.headMap
			]),
			columnsOrder: [
				...infoByItemType.columnsOrder,
				...headInfoByRelatedProperties.columnsOrder
			],
			orderBy: infoByItemType.orderBy,
			classStructure: new Map([
				...infoByItemType.classStructure,
				...headInfoByRelatedProperties.classStructure
			]),
			itemTypeName: infoByItemType.itemTypeName,
			linkItemTypeName: {
				related_id: headInfoByRelatedProperties.itemTypeName
			}
		};

		const claimByColumnData = getClaimedByColumnData();
		claimByColumnData.linkProperty = 'related_id';
		infoByItemType.columnsOrder.unshift('L');
		infoByItemType.headMap.set('L', claimByColumnData);
	}

	infoByItemType.orderBy = getSortOrder(
		infoByItemType.orderBy,
		headInfoByRelatedProperties?.orderBy,
		gridView
	);

	return await getFullGridHeaderInfo(infoByItemType, userPreferences);
}

export async function adaptGridHeader(itemTypeId, userPreferencesItem = null) {
	const infoByItemType = await getGridHeaderInfoByItemType(itemTypeId, {
		criteria: 'is_hidden',
		postfix: '_D'
	});

	infoByItemType.columnsOrder.unshift('L');
	infoByItemType.headMap.set('L', getClaimedByColumnData());

	return await getFullGridHeaderInfo(infoByItemType, userPreferencesItem);
}

const getFullGridHeaderInfo = async (infoByItemType, userPreferencesItem) => {
	const fullInfo = { ...infoByItemType };

	const promises = [getHeadLists(fullInfo.headMap)];
	const isCurrentStateVisible = [...fullInfo.headMap.values()].some(
		({ name }) => name === 'current_state'
	);
	if (isCurrentStateVisible) {
		promises.push(getLifeCycleStates());
	}
	const [lists, lifeCycleStates = new Map()] = await Promise.all(promises);

	if (userPreferencesItem) {
		const infoByPreferences =
			getGridHeaderInfoByPreferences(userPreferencesItem);
		infoByPreferences.indexHead.forEach((columnName) => {
			fullInfo.headMap.get(columnName).width =
				infoByPreferences.widthMap.get(columnName) || DEFAULT_COLUMN_WIDTH;
		});
		fullInfo.indexHead = infoByPreferences.indexHead;
	} else {
		fullInfo.indexHead = fullInfo.columnsOrder;
	}

	fullInfo.metadata = {
		headLists: lists,
		classStructure: fullInfo.classStructure,
		itemTypeName: fullInfo.itemTypeName,
		linkItemTypeName: fullInfo.linkItemTypeName,
		lifeCycleStates
	};

	fullInfo.columnsOrder.forEach((columnName, index) => {
		fullInfo.headMap.get(columnName).layoutIndex = index;
	});

	return fullInfo;
};

const getSortOrder = (
	relationshipColumnsSortOrder,
	relatedColumnsSortOrder = [],
	gridView
) => {
	let resultSortOrder = [
		...relationshipColumnsSortOrder,
		...relatedColumnsSortOrder
	];
	if (gridView === 'intermix') {
		resultSortOrder = resultSortOrder.sort((orderInfo1, orderInfo2) => {
			const orderBy1 = orderInfo1.orderBy;
			const orderBy2 = orderInfo2.orderBy;

			if (orderBy1 === orderBy2) {
				return 0;
			}

			return orderBy1 < orderBy2 ? -1 : 1;
		});
	} else if (gridView === 'left') {
		resultSortOrder = [
			...relatedColumnsSortOrder,
			...relationshipColumnsSortOrder
		];
	}

	return resultSortOrder.map((orderInfo) => ({
		headId: orderInfo.headId,
		desc: false
	}));
};

const getClaimedByColumnData = () => {
	return {
		id: 'L',
		label: '',
		defaultLabel: getResource('common.claimed'),
		field: 'L',
		name: 'locked_by_id',
		columnCssStyles: {
			'text-align': 'center'
		},
		editable: false,
		isReadOnly: true,
		searchType: 'dropDownIcon',
		icon: icons.claimColumn,
		dataType: 'claim by',
		width: 32,
		options: [
			{
				value: '',
				icon: '',
				label: 'Clear Criteria'
			},
			{
				value: 'ClaimOn.svg',
				icon: icons.claimOn,
				label: 'Claimed By Me'
			},
			{
				value: 'ClaimOther.svg',
				icon: icons.claimOther,
				label: 'Claimed By Others'
			},
			{
				value: 'ClaimAnyone.svg',
				icon: icons.claimAnyone,
				label: 'Claimed By Anyone'
			}
		]
	};
};

const getLifeCycleStates = async () => {
	const states = await aras.MetadataCache.GetLifeCycleStates();
	return states.value.reduce(
		(statesMap, state) => statesMap.set(state.id, state),
		new Map()
	);
};

const getHeadLists = async (headers) => {
	const listIds = [];
	const filterListIds = [];

	headers.forEach((head) => {
		if (!listSet.has(head.dataType)) {
			return;
		}

		if (head.dataType === 'filter list') {
			filterListIds.push(head.dataSource);
			return;
		}

		listIds.push(head.dataSource);
	});

	return await getSeveralListsValues(listIds, filterListIds);
};

const getSeveralListsValues = async (listIds, filterListIds) => {
	const jsonLists = (
		await aras.MetadataCacheJson.GetList(listIds, filterListIds)
	)
		.map((list) => list.value[0])
		.reduce((acc, list) => {
			acc[list.id] = list.Value || list['Filter Value'] || [];
			return acc;
		}, {});

	return Object.keys(jsonLists).reduce((acc, listId) => {
		const listNodes = jsonLists[listId];
		acc[listId] = listNodes.map((listNode) => {
			return {
				value: listNode.value || '',
				label: listNode.label || listNode.value || '',
				filter: listNode.filter || '',
				inactive: listNode.inactive === '1'
			};
		});

		return acc;
	}, {});
};

const getGridHeaderInfoByItemType = async (itemTypeId, options = {}) => {
	if (!itemTypeId) {
		return null;
	}

	const itemType = await itemTypeMetadata.getItemType(itemTypeId, 'id');
	if (!itemType) {
		return null;
	}

	const classStructure = getItemTypeClassStrucrute(itemType.class_structure);
	const itemTypeVisibleProps = getVisiblePropsForItemType(
		itemType,
		options.criteria
	);
	const xProperties = getItemTypeXProperties(itemType);
	const visibleProps = itemTypeVisibleProps.concat(xProperties);

	const gridHeader = await buildGridHeader(
		visibleProps,
		itemType,
		options.postfix
	);

	return {
		...gridHeader,
		classStructure: new Map().set(itemType.name, classStructure),
		itemTypeName: itemType.name
	};
};

const getGridHeaderInfoByPreferences = (userPreferencesItem) => {
	const userPreferences = ArasModules.xmlToJson(userPreferencesItem.xml).Item;
	const columnsOrder = userPreferences['col_order'].split(';');
	const columnsWidth = userPreferences['col_widths'].split(';');

	const widthMap = columnsOrder.reduce(
		(acc, columnName, index) =>
			acc.set(columnName, parseInt(columnsWidth[index])),
		new Map()
	);

	return {
		indexHead: columnsOrder.filter(
			(columnName) => widthMap.get(columnName) > 0
		),
		widthMap: widthMap
	};
};

const parseRecursive = (items) => {
	items = Array.isArray(items) ? items : [items];

	return items.map((item) => {
		return {
			label: item['@attrs'].name,
			children: item.class ? parseRecursive(item.class) : []
		};
	});
};

const getItemTypeClassStrucrute = (classStructure) => {
	if (!classStructure) {
		return [];
	}

	const rootItem = classStructure
		? ArasModules.xmlToJson(classStructure).class
		: {};
	return parseRecursive(rootItem.class || []);
};

const getLabel = (property) => {
	const label = property.label || property.name;
	const labelWithPostfix = label + ' [...]';
	const dataType = property.data_type;
	const dataSource = property['data_source@aras.id'];
	const propertyName = property.name;

	if (labelWithPostfixTypes.includes(dataType)) {
		return labelWithPostfix;
	}

	const treatAsItemProperty =
		dataType === 'item' && dataSource && propertyName !== 'current_state';

	return treatAsItemProperty ? labelWithPostfix : label;
};

const getSortFormatLocaleInfo = (dataType, property) => {
	const resultObject = {
		locale: null,
		inputformat: undefined,
		sort: null
	};
	const locale = aras.getSessionContextLocale();
	switch (dataType) {
		case 'date': {
			const defaultPattern = 'MM/dd/yyyy';
			const format =
				aras.getDotNetDatePattern(property.pattern) || defaultPattern;

			resultObject.sort = 'DATE';
			resultObject.inputformat = format;
			resultObject.locale = locale;
			break;
		}
		case 'decimal': {
			const format = aras.getDecimalPattern(property.prec, property.scale);

			resultObject.sort = 'NUMERIC';
			resultObject.inputformat = format || null;
			resultObject.locale = locale;
			break;
		}
		case 'integer':
		case 'float': {
			resultObject.sort = 'NUMERIC';
			resultObject.locale = locale;
			break;
		}
		case 'ubigint':
		case 'global_version': {
			resultObject.sort = 'UBIGINT';
			resultObject.locale = locale;
			break;
		}
	}
	return resultObject;
};

const getDataSourceName = (dataType, dataSource) =>
	dataType === 'item' && dataSource ? aras.getItemTypeName(dataSource) : null;

const getSearchType = (dataType, isForeign, name) => {
	switch (dataType) {
		case 'item':
			return !isForeign ? 'singular' : '';
		case 'date':
			return 'date';
		case 'mv_list':
			return 'multiValueList';
		case 'list':
		case 'filter list':
		case 'color list':
			return 'filterList';
	}
	return name === 'classification' ? 'classification' : '';
};

const getColumnDataType = (type, dataSourceName, name) => {
	if (name === 'classification' || name === 'current_state') {
		return name;
	}

	return dataSourceName === 'File' ? 'file' : type;
};

const buildGridHeader = async (visibleProperties, itemType, postfix) => {
	const headMap = new Map();
	const columnsOrder = [];
	const sortOrder = [];
	const sourceProperties = await itemTypeMetadata.getForeignPropertiesSources(
		itemType
	);

	const head = visibleProperties.reduce((acc, property) => {
		// we have to save isForeign value since on the next line property we are using can be changed to property of source item
		const isForeign = property.data_type === 'foreign';
		const sourceProperty = isForeign
			? sourceProperties.get(property.id)
			: property;

		const name = property.name;
		const fieldKey = name + postfix;
		const dataSource = sourceProperty['data_source@aras.id'];
		const nativeDataType = sourceProperty.data_type || '';
		const dataSourceName = getDataSourceName(nativeDataType, dataSource);
		const dataType = getColumnDataType(nativeDataType, dataSourceName, name);
		const sortFormatLocaleObject = getSortFormatLocaleInfo(
			dataType,
			sourceProperty
		);

		//Add by tz 2023/6/6 表格列帮助说明功能
		const questionMark = Boolean(property.help_text || property.help_tooltip);

		const header = {
			name,
			id: property.id,
			isReadOnly: property.readonly === '1',
			field: fieldKey,
			defaultLabel: property.label || name,
			label: getLabel(property),
			columnCssStyles: {
				'text-align': property.column_alignment || 'left'
			},

			...sortFormatLocaleObject,
			scale: sourceProperty.scale,
			pattern: sourceProperty.pattern,
			precision: sourceProperty.prec,
			maxLength: sourceProperty.stored_length,

			isForeign,
			dataType,
			dataSource,
			dataSourceName,
			editable: false, // L column is never editable; can be true for relship grid
			searchType: getSearchType(dataType, isForeign, name),
			width: property['column_width'] || DEFAULT_COLUMN_WIDTH,

			//Add by tz 2023/6/6 表格列帮助说明功能
			helpTooltip: property.help_tooltip,
			helpText: property.help_text,

			questionMark
			//End Add
		};

		acc.set(fieldKey, header);
		columnsOrder.push(fieldKey);

		const orderBy = property.order_by;
		if (orderBy !== null) {
			sortOrder.push({
				headId: fieldKey,
				orderBy
			});
		}

		return acc;
	}, headMap);

	sortOrder.sort(
		({ orderBy: orderByLeft }, { orderBy: orderByRight }) =>
			orderByLeft - orderByRight
	);

	return {
		headMap: head,
		columnsOrder: columnsOrder,
		orderBy: sortOrder
	};
};

const getItemTypeXProperties = (itemType) => {
	const xItemTypeAllowedProperty = itemType.xItemTypeAllowedProperty || [];

	return xItemTypeAllowedProperty
		.filter((xProperty) => xProperty.inactive !== '1')
		.map((xProperty) => xProperty.related_id);
};

const getVisiblePropsForItemType = (currItemType, criteriaName) =>
	currItemType.Property.filter(
		(property) => property[criteriaName] === '0'
	).sort(sortProperties);

const parseNumber = (number) =>
	number || number === 0 ? number : Number.POSITIVE_INFINITY;

const sortProperties = (propertyNode1, propertyNode2) => {
	let sortOrder1 = parseNumber(propertyNode1.sort_order);
	let sortOrder2 = parseNumber(propertyNode2.sort_order);

	if (sortOrder1 === sortOrder2) {
		sortOrder1 = propertyNode1.name;
		sortOrder2 = propertyNode2.name;
	}

	return sortOrder1 < sortOrder2 ? -1 : 1;
};
