import HyperHTMLElement from 'hyperhtml-element';
import { wire } from 'hyperhtml';
import getResource from '../core/resources';
import tooltipCSS from '../../styles/less/components/tooltip.less';
import { iconStylesheet } from './stylesheets';

const tooltipStylesheet = new CSSStyleSheet();
tooltipStylesheet.replaceSync(tooltipCSS);
type position = keyof typeof reversePosition;
type containerLocation = { height: number; width: number };
interface TooltipRecord {
	formatterType: string;
	target: HTMLElement;
	position: position;
	title: string;
	extendHelpInfo: string;
	helpText: string;
	arrow: boolean;
}

const arrowLength = 8;
const arrowHeigth = 12;
const defaultPosition = 'bottom';
const reversePosition = {
	top: 'bottom',
	bottom: 'top',
	left: 'right',
	right: 'left'
} as const;

export default class Tooltip extends HyperHTMLElement<TooltipRecord> {
	#timeout: NodeJS.Timeout | null = null;
	declare shown: boolean;
	declare hover: boolean;
	declare arrow: boolean;
	declare position: position;
	static formatters: Map<string, (record: TooltipRecord) => Node> = new Map();
	static get #eventList(): string[] {
		return ['mouseenter', 'mouseleave'];
	}

	static get booleanAttributes(): string[] {
		return ['shown', 'hover', 'arrow'];
	}

	static override get observedAttributes(): string[] {
		return ['position'];
	}

	override created() {
		const shadow = this.attachShadow({ mode: 'open' });
		shadow.adoptedStyleSheets = [tooltipStylesheet, iconStylesheet];
		// this render for Firefox 91, we have polyfill for replaceSync which is available only from FF101
		// styles are attached with this render
		this.render();
	}

	connectedCallback() {
		window.addEventListener('showTooltip', this);
		Tooltip.#eventList.forEach((name) => {
			this.addEventListener(name, this);
		});
	}

	disconnectedCallback() {
		window.removeEventListener('showTooltip', this);
		Tooltip.#eventList.forEach((name) => {
			this.removeEventListener(name, this);
		});
	}

	override handleEvent(event: CustomEvent | MouseEvent) {
		if (event instanceof CustomEvent) {
			this.#onTooltipShow(event);
			return;
		}
		switch (event.type) {
			case 'mouseenter':
				this.shown = true;
				this.hover = true;
				break;
			case 'mouseleave':
				if (this.#timeout) {
					window.clearTimeout(this.#timeout);
					this.#timeout = null;
				}
				this.shown = false;
				break;
		}
	}

	override attributeChangedCallback(attribute: string) {
		if (attribute !== 'arrow' && attribute !== 'hover') {
			this.render();
		}
	}
	#setLocation() {
		const targetLocation = this.state.target.getBoundingClientRect();
		const tooltipLocation = this.getBoundingClientRect();
		const parentElement = this.parentElement;
		if (!parentElement) {
			return;
		}
		const containerLocation = {
			height: parentElement.clientHeight,
			width: parentElement.clientWidth
		};
		this.position = this.#determinePosition(
			targetLocation,
			tooltipLocation,
			containerLocation
		);
		const coordinates = this.#determineOffset(
			targetLocation,
			tooltipLocation,
			containerLocation,
			this.position
		);
		this.style.top = coordinates.top;
		this.style.left = coordinates.left ?? 'auto';
		this.style.right = coordinates.right ?? 'auto';
	}
	#determineOffset(
		target: DOMRect,
		tooltip: DOMRect,
		container: containerLocation,
		position: position
	) {
		const coordinates = this.#determineСoordinates(
			target,
			tooltip,
			container,
			position
		);

		if (position === 'bottom' || position === 'top') {
			const tooltipMiddleWidth = tooltip.width / 2;
			const targetMiddleWidth = target.width / 2;
			const rightLocation =
				target.left + targetMiddleWidth + tooltipMiddleWidth;
			const hasRightOffset = rightLocation >= container.width;
			const hasLeftOffset =
				target.left + targetMiddleWidth < tooltipMiddleWidth;
			const maxValidShift = tooltipMiddleWidth - arrowLength / 2;

			if (hasRightOffset) {
				const isTargetCenterVisible =
					target.left + targetMiddleWidth < container.width;
				const shift = rightLocation - container.width;
				if (
					shift <= maxValidShift &&
					isTargetCenterVisible &&
					coordinates.right
				) {
					this.#createShift(-shift);
					return {
						top: coordinates.top + 'px',
						right: coordinates.right + shift + 'px'
					};
				}

				return { top: coordinates.top + 'px', right: coordinates.right + 'px' };
			}

			if (hasLeftOffset) {
				const shift = tooltipMiddleWidth - (target.left + targetMiddleWidth);
				if (shift <= maxValidShift) {
					this.#createShift(shift);
					return {
						top: coordinates.top + 'px',
						left: coordinates.left + shift + 'px'
					};
				}
			}
		}
		if (position === 'left' || position === 'right') {
			const tooltipMiddleHeight = tooltip.height / 2;
			const targetMiddleHeight = target.height / 2;
			const bottomLocation =
				targetMiddleHeight + target.top + tooltipMiddleHeight;
			const hasBottomOffset =
				target.top + targetMiddleHeight < container.height &&
				bottomLocation > container.height;
			const hasTopOffset =
				target.top + targetMiddleHeight < tooltipMiddleHeight;
			const maxValidShift = tooltipMiddleHeight - arrowHeigth / 2;
			if (hasBottomOffset) {
				const shift = bottomLocation - container.height;
				if (shift <= maxValidShift) {
					this.#createShift(-shift);
					return {
						top: coordinates.top - shift + 'px',
						left: coordinates.left + 'px'
					};
				}
			}
			if (hasTopOffset) {
				const shift = tooltipMiddleHeight - (target.top + targetMiddleHeight);
				if (shift <= maxValidShift) {
					this.#createShift(shift);
					return {
						top: coordinates.top + shift + 'px',
						left: coordinates.left + 'px'
					};
				}
			}
		}
		return {
			top: coordinates.top + 'px',
			left: coordinates.left + 'px'
		};
	}

	#determinePosition(
		target: DOMRect,
		tooltip: DOMRect,
		container: containerLocation
	): position {
		let needReverse;
		const position = this.state.position;
		switch (position) {
			case 'bottom':
				needReverse =
					tooltip.height + target.bottom + arrowLength > container.height;
				break;
			case 'top':
				needReverse = tooltip.height + arrowLength > target.top;
				break;
			case 'right':
				needReverse =
					tooltip.width + target.right + arrowLength > container.width;
				break;
			case 'left':
				needReverse = tooltip.width + arrowLength > target.left;
				break;
		}
		if (needReverse) {
			return reversePosition[position];
		}
		return position;
	}

	#createShift(shift: number) {
		this.style.setProperty('--shift', `${shift}px`);
	}

	#determineСoordinates(
		target: DOMRect,
		tooltip: DOMRect,
		container: containerLocation,
		position: position
	) {
		const middleWidth = (target.width + tooltip.width) / 2;
		const ledgeOnTheRight = target.left + middleWidth - container.width;
		const hasLedgeOnTheRight = ledgeOnTheRight > 0;
		const horizontalLocation = {
			left: target.left + target.width / 2 - tooltip.width / 2,
			...(hasLedgeOnTheRight && {
				right: -ledgeOnTheRight
			})
		};
		if (position === 'top') {
			return {
				top: target.top - tooltip.height - arrowLength,
				...horizontalLocation
			};
		}
		const middleHeight = (-target.height + tooltip.height) / 2;
		if (position === 'right') {
			return {
				top: target.top - middleHeight,
				left: target.left + target.width + arrowLength
			};
		}
		if (position === 'left') {
			return {
				top: target.top - middleHeight,
				left: target.left - tooltip.width - arrowLength
			};
		}
		return {
			top: target.bottom + arrowLength,
			...horizontalLocation
		};
	}

	async #onTooltipShow(event: CustomEvent) {
		if (!this.parentElement || !event.target) {
			return;
		}
		const target = event.target;
		target.addEventListener('mouseleave', this, { once: true });
		if (this.#timeout) {
			window.clearTimeout(this.#timeout);
		}
		await new Promise((res) => {
			this.#timeout = setTimeout(res, 75);
		});
		this.#timeout = null;
		this.style.removeProperty('--shift');
		this.style.removeProperty('top');
		this.style.removeProperty('left');
		this.style.removeProperty('right');
		this.setState({
			formatterType: 'defaultFormatter',
			target,
			title: '',
			helpText: '',
			extendHelpInfo: '',
			arrow: true,
			position: defaultPosition,
			...event.detail
		});
		this.hover = false;
		this.arrow = this.state.arrow !== false;
		this.shown = true;
		this.#setLocation();
	}

	#defaultFormatter(record: TooltipRecord) {
		const showMoreDialogHandler = () => {
			const { title, extendHelpInfo = '' } = record;
			const topWindow = aras.getMostTopWindowWithAras();

			topWindow.ArasCore.Dialogs.text(extendHelpInfo, { title });
		};

		const { title, extendHelpInfo, helpText } = record;
		const titleRow =
			title &&
			wire(
				this,
				':tooltip-title'
			)`<div class="aras-tooltip-component__title">${title}</div>`;
		const helpTextRow =
			helpText &&
			wire(
				this,
				':tooltip-text'
			)`<div class="aras-tooltip-component__help-tooltip-text">${helpText}</div>`;
		const extendHelpInfoRow =
			extendHelpInfo &&
			wire(
				this,
				':tooltip-dialog'
			)`<div class="aras-tooltip-component__help-text" onclick=${showMoreDialogHandler}><div class="aras-icon-question-mark" /><div class="aras-tooltip-component__show-dialog">${getResource(
				'tooltip.show_more'
			)}</div>`;
		return wire(
			this,
			':tooltip-content'
		)`${titleRow}${helpTextRow}${extendHelpInfoRow}`;
	}

	override render() {
		const formatter =
			Tooltip.formatters.get(this.state.formatterType) ??
			this.#defaultFormatter;
		const tooltipData = formatter(this.state);

		this.html`
			${tooltipData}
		`;
	}
}
