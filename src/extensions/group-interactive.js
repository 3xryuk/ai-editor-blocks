/**
 * Extensions for core/group block to add interactive components.
 *
 * This adds custom attributes (isAiSlider, isAiTabs, isAiAccordion) to the
 * core/group block, allowing the AI to generate interactive components.
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { Fragment } from '@wordpress/element';

/**
 * Add custom attributes to the core/group block.
 *
 * @param {Object} settings - Block settings.
 * @param {string} name     - Block name.
 * @return {Object} Modified block settings.
 */
function addInteractiveAttributes( settings, name ) {
	// Only target core/group block.
	if ( name !== 'core/group' ) {
		return settings;
	}

	// Add custom attributes for interactive components.
	settings.attributes = {
		...settings.attributes,
		isAiSlider: {
			type: 'boolean',
			default: false,
		},
		isAiTabs: {
			type: 'boolean',
			default: false,
		},
		isAiAccordion: {
			type: 'boolean',
			default: false,
		},
	};

	return settings;
}

/**
 * Add custom CSS classes to the block wrapper in the editor.
 * Uses editor.BlockListBlock filter for editor preview only.
 * The actual classes for frontend are added via PHP render_block filter.
 *
 * @param {Object} BlockListBlock - BlockListBlock component.
 * @return {Function} Wrapped component.
 */
const withInteractiveClasses = createHigherOrderComponent( ( BlockListBlock ) => {
	return ( props ) => {
		const { name, attributes } = props;

		// Only target core/group block.
		if ( name !== 'core/group' ) {
			return <BlockListBlock { ...props } />;
		}

		const interactiveClasses = [];

		// Add classes based on active interactive attribute.
		if ( attributes.isAiSlider ) {
			interactiveClasses.push( 'is-ai-slider', 'swiper' );
		}

		if ( attributes.isAiTabs ) {
			interactiveClasses.push( 'is-ai-tabs' );
		}

		if ( attributes.isAiAccordion ) {
			interactiveClasses.push( 'is-ai-accordion' );
		}

		// Merge with existing classes.
		if ( interactiveClasses.length > 0 ) {
			const existingClassName = props.className || '';
			const newClassName = existingClassName
				? `${ existingClassName } ${ interactiveClasses.join( ' ' ) }`
				: interactiveClasses.join( ' ' );

			return <BlockListBlock { ...props } className={ newClassName } />;
		}

		return <BlockListBlock { ...props } />;
	};
}, 'withInteractiveClasses' );

// Register filters.
addFilter(
	'blocks.registerBlockType',
	'ai-editor-blocks/group-interactive-attributes',
	addInteractiveAttributes
);

// Use editor.BlockListBlock for editor preview classes (not blocks.getSaveContent.extraProps)
// This avoids block validation errors since core/group is a dynamic block.
addFilter(
	'editor.BlockListBlock',
	'ai-editor-blocks/group-interactive-classes',
	withInteractiveClasses
);
