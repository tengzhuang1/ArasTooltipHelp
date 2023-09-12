import polySources from './polySources';
import multiLingual from './multiLingual';
import changePassword from './changePassword';
import activationError from './activationError';
import activationSuccessful from './activationSuccessful';
import about from './about';
import datePicker from './datePicker';
//Add by tz 2023/5/30 窗体控件帮助说明功能
import text from './text'; 
import newLayout from './newLayout';
import selectPackageDefinition from './selectPackageDefinition';
import createNewPackage from './createNewPackage';
import addToPackage from './addToPackage';
export {
	text,
	about,
	polySources,
	multiLingual,
	changePassword,
	activationError,
	activationSuccessful,
	datePicker,
	newLayout,
	selectPackageDefinition,
	createNewPackage
};

// @ts-expect-error Property 'ArasCore' does not exist on type 'Window & typeof globalThis'
const ArasCore = window.ArasCore ?? {};
// @ts-expect-error Property 'ArasCore' does not exist on type 'Window & typeof globalThis'
window.ArasCore = Object.assign(ArasCore, {
	Dialogs: {
		...ArasCore.Dialogs,
		about,
		polySources,
		multiLingual,
		changePassword,
		activationError,
		activationSuccessful,
		datePicker,
		newLayout,
		selectPackageDefinition,
		createNewPackage,
		text
	}
});

// @ts-expect-error Property 'ArasModules' does not exist on type 'Window & typeof globalThis'
const ArasModules = window.ArasModules ?? {};
// @ts-expect-error Property 'ArasModules' does not exist on type 'Window & typeof globalThis'
window.ArasModules = Object.assign(ArasModules, {
	metadata: { ...ArasModules.metadata, addToPackage }
});
