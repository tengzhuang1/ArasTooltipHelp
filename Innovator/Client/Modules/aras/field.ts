// eslint-disable-next-line
// @ts-nocheck
(function () {
	function applyEventHandler(handler, dom) {
		const events = [
			'click',
			'dblclick',
			'focusin',
			'focusout',
			'select',
			'change',
			'keydown',
			'keypress'
		];
		for (let i = 0; i < events.length; i++) {
			const eventName = events[i];
			dom.addEventListener(eventName, handler);
		}
	}

	function applyEvents(eventList, instance) {
		const events = eventList.split(',');
		for (let i = 0; i < events.length; i++) {
			const event = events[i].split(':');
			const callback = window[event[1]];
			let eventName = event[0];
			if (eventName === 'focus') {
				eventName = 'focusin';
			}
			if (eventName === 'blur') {
				eventName = 'focusout';
			}
			if (callback && typeof callback === 'function') {
				instance.on(eventName, callback);
			}
		}
	}

	function runHandler(evt, handler) {
		try {
			if (handler.bind(evt.target)(evt) === false) {
				return false;
			}
		} catch (exp) {
			const errorMsg = aras.getResource(
				'',
				'ui_methods_ex.event_handler_failure_msg',
				exp.description ? exp.description : exp
			);
			aras.AlertError(
				aras.getResource('', 'ui_methods_ex.event_handler_failed'),
				errorMsg,
				aras.getResource('', 'common.client_side_err')
			);
			return false;
		}
	}

	function Field(container, component, eventList) {
		if (!container) {
			return;
		}
		this.dom = container;
		this.component = component;
		this.events = {};
		this.init();
		document.addEventListener(
			'DOMContentLoaded',
			applyEvents.bind(null, eventList, this)
		);
	}

	Field.prototype = {
		init: function () {
			applyEventHandler(this._eventHandler.bind(this), this.dom);
			this.component.render().then(
				function () {
					let zIndex = null;
					const dropdown = this.dom.querySelector('.aras-dropdown');
					const container = this.dom.closest('fieldset').parentNode;

					if (!dropdown || !container) {
						return;
					}

					const observer = new MutationObserver(function (mutations) {
						mutations.forEach(function (mutation) {
							const isOpened = mutation.target.classList.contains(
								'aras-dropdown_opened'
							);
							if (isOpened && zIndex === null) {
								zIndex = container.style.zIndex;
							}

							container.style.zIndex = isOpened ? 999 : zIndex;
						});
					});

					observer.observe(dropdown, {
						attributes: true,
						attributeFilter: ['class']
					});
				}.bind(this)
			);
		},
		on: function (event, callback) {
			const events = this.events;
			if (!events[event]) {
				events[event] = new Set();
			}
			if (!events[event].has(callback)) {
				events[event].add(callback);
				return function () {
					events[event].delete(callback);
				};
			}
		},
		setValue: function (val) {
			this.component.setState({ value: val });
		},
		getValue: function () {
			return this.component.state.value || '';
		},
		setDisabled: function (bool) {
			this.component.setState({ disabled: bool });
		},
		setReadOnly: function (bool) {
			this.component.setState({ readonly: bool });
		},
		_eventHandler: function (evt) {
			const target = evt.target;
			if (
				target === this.component ||
				target.tagName === 'INPUT' ||
				(target.tagName === 'SPAN' && !target.classList.contains('aras-btn'))
			) {
				const eventHandlers = this.events[evt.type] || [];
				eventHandlers.forEach(function (handler) {
					if (typeof handler === 'function') {
						if (runHandler(evt, handler) === false) {
							return false;
						}
					}
				});
				if (evt.type === 'keydown' || evt.type === 'keypress') {
					if (evt.key === 'Enter') {
						evt.preventDefault();
					}
				}
			}
		}
	};

	//Add by tz 2023/5/30 窗体控件帮助说明功能
	window.showTooltipHandler = function (event) {
		const { target } = event;
		const { helptext, helptooltip, fieldlabel } = target.dataset;
		const icon = target.firstChild;

		icon.dispatchEvent(
			new CustomEvent('showTooltip', {
				bubbles: true,
				detail: {
					title: fieldlabel,
					extendHelpInfo: helptext,
					helpText: helptooltip,
					position: 'right'
				}
			})
		);
	};

	window.Field = Field;
})();
