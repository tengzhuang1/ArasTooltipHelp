// eslint-disable-next-line
// @ts-nocheck
import aml from './aml';
import copyTextToBuffer, { copyHtmlToBuffer } from './copyTextToBuffer';
import Dialog from './Dialog';
import intl from './intl';
import MaximazableDialog from './MaximazableDialog';
import { SyncPromise, soap, SOAPError } from './Soap';
import { sessionSoap, alertSoapError } from './SessionSoap';
import * as bunchSoap from './bunchSoap';
import SvgManager from './SvgManager';
import utils from './utils';
import vaultUploader from './vaultUploader';
import xml from './Xml';
import { xmlToJson, jsonToXml } from './XmlToJson';
import {
	xmlToODataJson,
	xmlToODataJsonAsCollection,
	xmlToODataJsonByItemType
} from './XmlToODataJson';
import fetch from './sessionFetch';
import odataFetch from './odataFetch';

import Sidebar from '../components/sidebar';
import alertModule from '../components/alert';
import ContextMenu from '../components/contextMenu';
import confirmModule from '../components/confirm';
import promptModule from '../components/prompt';
import notify from '../components/notify';
import Dropdown from '../components/dropdown';
import dropdownButton from '../components/dropdownButton';
import Tabs from '../components/tabs';
import ViewersTabs from '../components/viewersTabs';
import Calendar from '../components/calendar';
import TimePicker from '../components/timePicker';
import Toolbar from '../components/toolbar';
import Form from '../components/form';
import CompatToolbar from '../components/compatToolbar';
import {
	toolbarTemplates as compatToolbarTemplates,
	toolbarFormatters as compatToolbarFormatters
} from '../components/compatToolbarTemplates';
import BaseTypeahead from '../components/baseTypeahead';
import FilterList from '../components/filterList';
import ItemProperty from '../components/itemProperty';
import ClassificationProperty from '../components/classificationProperty';
import Nav from '../components/nav/nav';
import navTemplates from '../components/nav/navTemplates';
import Menu from '../components/menu';

import { HeadWrap, RowsWrap } from '../components/grid/utils';
import Keyboard from '../components/grid/keyboard';
import GridActions from '../components/grid/actions';
import gridTemplates from '../components/grid/templates';
import GridView from '../components/grid/view';
import gridEditors from '../components/grid/editors';
import gridFormatters from '../components/grid/formatters';
import { extend as extendGridSorters } from '../components/grid/sorters';
import dataTypeFormatters from '../components/grid/dataTypeFormatters';
import GridSearch from '../components/grid/search';
import Grid from '../components/grid/grid';

import TreeGrid from '../components/treeGrid/treeGrid';
import TreeGridActions from '../components/treeGrid/treeGridActions';
import treeGridTemplates from '../components/treeGrid/treeGridTemplates';
import TreeGridView from '../components/treeGrid/treeGridView';
import Accordion from '../components/accordion';
import Scroller from '../components/scroller';
import Switcher from '../components/switcher';
import Pagination from '../components/pagination/pagination';
import Splitter from '../components/splitter';
import CardTable from '../components/cardTable';
import Input from '../components/input';
//Add by tz 2023/5/30 窗体控件帮助说明功能
import Tooltip from '../components/tooltip';

import '../components/spinner';

gridFormatters.extend(dataTypeFormatters);

window.Toolbar = Toolbar;
window.Input = Input;
window.Form = Form;
window.CompatToolbar = CompatToolbar;
window.CompatToolbar.formatters = compatToolbarFormatters;
window.CompatToolbar.toolbarTemplates = compatToolbarTemplates;
window.Pagination = Pagination;

window.BaseTypeahead = BaseTypeahead;
window.FilterList = FilterList;
window.ItemProperty = ItemProperty;
window.ClassificationProperty = ClassificationProperty;
window.Nav = Nav;
window.NavTemplates = navTemplates;

window.GridActions = GridActions;
window.Keyboard = Keyboard;
window.GridTemplates = gridTemplates;
window.HeadWrap = HeadWrap;
window.RowsWrap = RowsWrap;
window.GridView = GridView;

window.Grid = Grid;
window.GridView = GridView;
window.GridActions = GridActions;

window.Grid.editors = gridEditors;
window.Grid.sorters = {
	extend: extendGridSorters
};
window.Grid.search = GridSearch;

window.TreeGrid = TreeGrid;
window.TreeGridActions = TreeGridActions;
window.TreeGridTemplates = treeGridTemplates;
window.TreeGridView = TreeGridView;
window.CardTable = CardTable;

Dialog.alert = alertModule;
Dialog.confirm = confirmModule;
Dialog.prompt = promptModule;

window.ArasModules = window.ArasModules || {};

const core = {
	aml,
	copyTextToBuffer,
	copyHtmlToBuffer,
	Dialog: Dialog,
	nativSoap: soap,
	SOAPError,
	soap: sessionSoap,
	alertSoapError: alertSoapError,
	intl: intl,
	jsonToXml: jsonToXml,
	MaximazableDialog: MaximazableDialog,
	SyncPromise: SyncPromise,
	SvgManager: SvgManager,
	utils: utils,
	vault: vaultUploader,
	xml: xml,
	xmlToJson: xmlToJson,
	ContextMenu: ContextMenu,
	notify: notify,
	dropdownButton: dropdownButton,
	xmlToODataJson: xmlToODataJson,
	xmlToODataJsonAsCollection: xmlToODataJsonAsCollection,
	xmlToODataJsonByItemType,
	fetch: fetch,
	odataFetch: odataFetch,
	bunchSoap
};

const webComponents = {
	'aras-filter-list': FilterList,
	'aras-item-property': ItemProperty,
	'aras-classification-property': ClassificationProperty,
	'aras-nav': Nav,
	'aras-sidebar': Sidebar,
	'aras-toolbar': Toolbar,
	'aras-form': Form,
	'aras-accordion': Accordion,
	'aras-scroller': Scroller,
	'aras-switcher': Switcher,
	'aras-tabs': Tabs,
	'aras-viewers-tabs': ViewersTabs,
	'aras-calendar': Calendar,
	'aras-time-picker': TimePicker,
	'aras-dropdown': Dropdown,
	'aras-pagination': Pagination,
	'aras-menu': Menu,
	'aras-grid': Grid,
	'aras-tree-grid': TreeGrid,
	'aras-splitter': Splitter,
	'aras-tooltip': Tooltip
};

Object.keys(webComponents).forEach(function (name) {
	if (!customElements.get(name)) {
		if ('define' in webComponents[name]) {
			webComponents[name].define(name);
		} else {
			customElements.define(name, webComponents[name]);
		}
	}
});

window.ArasModules = Object.assign(window.ArasModules, core);

export {
	alertSoapError,
	aml,
	BaseTypeahead,
	CardTable,
	ClassificationProperty,
	CompatToolbar,
	ContextMenu,
	copyHtmlToBuffer,
	copyTextToBuffer,
	Dialog,
	dropdownButton,
	fetch,
	FilterList,
	Form,
	Grid,
	Input,
	intl,
	ItemProperty,
	jsonToXml,
	MaximazableDialog,
	Nav,
	notify,
	odataFetch,
	Pagination,
	sessionSoap as soap,
	soap as nativSoap,
	SOAPError,
	SvgManager,
	SyncPromise,
	Toolbar,
	TreeGrid,
	utils,
	vaultUploader as vault,
	xml,
	xmlToJson,
	xmlToODataJson,
	xmlToODataJsonAsCollection,
	xmlToODataJsonByItemType,
	bunchSoap
};
