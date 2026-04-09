import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import { Notice, TextareaControl, Button, Spinner } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { parse } from '@wordpress/blocks';
import apiFetch from '@wordpress/api-fetch';
import './editor.scss';

/**
 * Get a summary of a block for context purposes.
 *
 * @param {Object} block - The block object.
 * @return {string} A short description of the block.
 */
function getBlockSummary( block ) {
	if ( ! block ) {
		return 'none';
	}

	const blockName = block.name || 'unknown';
	const attributes = block.attributes || {};

	// Get a brief summary based on block type
	switch ( blockName ) {
		case 'core/paragraph':
			const text = attributes.content?.replace( /<[^>]+>/g, '' ).substring( 0, 50 );
			return `Paragraph: "${ text }${ text?.length >= 50 ? '...' : '' }"`;
		case 'core/heading':
			const headingText = attributes.content?.replace( /<[^>]+>/g, '' ).substring( 0, 50 );
			return `Heading (level ${ attributes.level || 2 }): "${ headingText }${ headingText?.length >= 50 ? '...' : '' }"`;
		case 'core/image':
			return `Image: ${ attributes.alt || 'no alt text' }`;
		case 'core/list':
			return `List (${ attributes.ordered ? 'ordered' : 'unordered' })`;
		case 'core/quote':
			return `Quote`;
		case 'core/columns':
			return `Columns (${ attributes.columns || 'auto' } columns)`;
		case 'core/group':
			return `Group`;
		case 'core/cover':
			return `Cover`;
		case 'core/gallery':
			return `Gallery (${ attributes.images?.length || 0 } images)`;
		case 'core/video':
			return `Video`;
		case 'core/audio':
			return `Audio`;
		case 'core/table':
			return `Table`;
		case 'core/separator':
			return `Separator`;
		case 'core/spacer':
			return `Spacer`;
		default:
			return blockName.replace( 'core/', '' );
	}
}

/**
 * Build editor context string for AI prompt.
 *
 * @param {string} clientId - The current block's clientId.
 * @return {Object} Context object with surrounding blocks info.
 */
function getEditorContext( clientId ) {
	const { getBlocks, getBlockIndex, getPreviousBlockClientId, getNextBlockClientId } =
		wp.data.select( 'core/block-editor' );

	const blocks = getBlocks();
	const currentIndex = getBlockIndex( clientId );
	const previousClientId = getPreviousBlockClientId( clientId );
	const nextClientId = getNextBlockClientId( clientId );

	const previousBlock = previousClientId ? wp.data.select( 'core/block-editor' ).getBlock( previousClientId ) : null;
	const nextBlock = nextClientId ? wp.data.select( 'core/block-editor' ).getBlock( nextClientId ) : null;

	// Get total blocks count and current position
	const totalBlocks = blocks.length;
	const position = currentIndex + 1; // 1-based for human readability

	// Get a summary of all blocks (limited to avoid huge prompts)
	const blocksSummary = blocks.slice( 0, 20 ).map( ( block, index ) => {
		const isCurrent = index === currentIndex;
		return `${ index + 1 }. ${ getBlockSummary( block ) }${ isCurrent ? ' (current position)' : '' }`;
	} ).join( '\n' );

	return {
		totalBlocks,
		currentPosition: position,
		previousBlock: getBlockSummary( previousBlock ),
		nextBlock: getBlockSummary( nextBlock ),
		blocksSummary,
	};
}

export default function Edit( { clientId } ) {
	const blockProps = useBlockProps();
	const [ prompt, setPrompt ] = useState( '' );
	const [ isLoading, setIsLoading ] = useState( false );
	const [ error, setError ] = useState( null );
	const { replaceBlocks } = useDispatch( 'core/block-editor' );

	// Get editor context using useSelect
	const editorContext = useSelect( ( select ) => {
		const { getBlocks, getBlockIndex, getPreviousBlockClientId, getNextBlockClientId, getBlock } =
			select( 'core/block-editor' );

		const blocks = getBlocks();
		const currentIndex = getBlockIndex( clientId );
		const previousClientId = getPreviousBlockClientId( clientId );
		const nextClientId = getNextBlockClientId( clientId );

		const previousBlock = previousClientId ? getBlock( previousClientId ) : null;
		const nextBlock = nextClientId ? getBlock( nextClientId ) : null;

		const totalBlocks = blocks.length;
		const position = currentIndex + 1;

		// Get a summary of all blocks (limited to avoid huge prompts)
		const blocksSummary = blocks.slice( 0, 20 ).map( ( block, index ) => {
			const isCurrent = index === currentIndex;
			return `${ index + 1 }. ${ getBlockSummary( block ) }${ isCurrent ? ' (current position)' : '' }`;
		} ).join( '\n' );

		return {
			totalBlocks,
			currentPosition: position,
			previousBlock: getBlockSummary( previousBlock ),
			nextBlock: getBlockSummary( nextBlock ),
			blocksSummary,
		};
	}, [ clientId ] );

	const settings = window.aiebSettings || {};
	// We only need to check if settings exist (API key and URL are now handled server-side)
	const hasSettings = settings.model;

	const handleGenerate = async () => {
		if ( ! prompt.trim() ) return;
		setIsLoading( true );
		setError( null );

		try {
			// Use the AI skill from settings (loaded from gutenberg-ai-skill.md)
			const aiSkill = settings.aiSkill || '';
			
			let systemPrompt = aiSkill;

			// Add editor context to help AI understand the surrounding content
			if ( editorContext ) {
				systemPrompt += `\n\n## Editor Context
You are generating content for a block at position ${ editorContext.currentPosition } of ${ editorContext.totalBlocks } in the editor.
- Previous block: ${ editorContext.previousBlock }
- Next block: ${ editorContext.nextBlock }

Current document structure (first 20 blocks):
${ editorContext.blocksSummary }

Use this context to generate content that fits naturally with the surrounding blocks. For example:
- If the previous block is a heading, you might want to generate related content.
- If the next block is a paragraph, consider how your generated content transitions to it.
- Match the style and tone of the existing content.`;
			}

			if ( settings.themeData ) {
				systemPrompt += `\n\n## Theme Data
Consider the following theme data when generating blocks (e.g., for colors or fonts):
${ JSON.stringify( settings.themeData, null, 2 ) }`;
			}

			// Add interactive components instructions
			systemPrompt += `\n\n## INTERACTIVE COMPONENTS (Sliders, Tabs, Accordions):
You can create interactive components using the core/group block with special attributes.

### SLIDER (Swiper.js):
To create a slider/carousel, use a core/group block with the "isAiSlider" attribute.
Each slide should be a core/cover or core/group block inside the slider.

Example:
<!-- wp:group {"isAiSlider":true} -->
<div class="wp-block-group is-ai-slider swiper">
	<!-- wp:cover {"url":"image1.jpg"} -->
	<div class="wp-block-cover"><span>Slide 1</span></div>
	<!-- /wp:cover -->
</div>
<!-- /wp:group -->

### TABS:
To create a tabbed interface, use a core/group block with the "isAiTabs" attribute.

### ACCORDION:
To create an accordion, use a core/group block with the "isAiAccordion" attribute.

IMPORTANT: Only use these interactive attributes when the user specifically requests a slider, tabs, or accordion component.`;

			// Use the local REST API proxy instead of direct OpenAI call
			const response = await apiFetch( {
				path: '/ai-editor-blocks/v1/generate',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify( {
					prompt: prompt,
					systemPrompt: systemPrompt,
				} ),
			} );

			// Extract the generated content from the response
			let generatedMarkup = response.data?.choices?.[ 0 ]?.message?.content || '';

			// Clean up the response - remove markdown code blocks if present.
			// More robust regex that handles: ```html, ```, with/without language, spaces, newlines
			generatedMarkup = generatedMarkup.replace( /^```[\w]*\s*\n?/gm, '' );
			generatedMarkup = generatedMarkup.replace( /\n?```\s*$/gm, '' );

			// Decode HTML entities that may be double-encoded by the API response.
			const textarea = document.createElement( 'textarea' );
			textarea.innerHTML = generatedMarkup;
			const cleanMarkup = textarea.value.trim();

			if ( ! cleanMarkup ) {
				throw new Error( __( 'No content generated.', 'ai-editor-blocks' ) );
			}

			const parsedBlocks = parse( cleanMarkup );

			// Debug: Log parsing results for troubleshooting.
			if ( parsedBlocks.length === 0 ) {
				console.warn( 'AIEB: Failed to parse blocks from content:', cleanMarkup );
			}

			if ( parsedBlocks.length === 0 ) {
				throw new Error( __( 'Failed to parse generated content into blocks.', 'ai-editor-blocks' ) );
			}

			replaceBlocks( clientId, parsedBlocks );
		} catch ( err ) {
			console.error( 'AI Generation Error:', err );
			
			// Handle different error formats
			let errorMessage = __( 'An error occurred during generation.', 'ai-editor-blocks' );
			
			if ( err.message ) {
				errorMessage = err.message;
			} else if ( err.data?.message ) {
				errorMessage = err.data.message;
			} else if ( typeof err === 'string' ) {
				errorMessage = err;
			}
			
			setError( errorMessage );
			setIsLoading( false );
		}
	};

	if ( ! hasSettings ) {
		return (
			<div { ...blockProps }>
				<Notice status="warning" isDismissible={ false }>
					{ __( 'AI Editor Blocks settings are missing. Please configure the API Key, URL, and Model in the settings page.', 'ai-editor-blocks' ) }
				</Notice>
			</div>
		);
	}

	return (
		<div { ...blockProps }>
			<div className="aieb-prompt-container">
				{ error && (
					<Notice status="error" isDismissible={ false } className="aieb-error-notice">
						{ error }
					</Notice>
				) }
				<TextareaControl
					label={ __( 'Enter your prompt', 'ai-editor-blocks' ) }
					value={ prompt }
					onChange={ ( value ) => setPrompt( value ) }
					rows={ 4 }
					disabled={ isLoading }
					help={ __( 'Describe what you want the AI to generate.', 'ai-editor-blocks' ) }
				/>
				<Button
					variant="primary"
					onClick={ handleGenerate }
					disabled={ isLoading || ! prompt.trim() }
				>
					{ isLoading ? (
						<>
							<Spinner />
							{ __( 'Generating...', 'ai-editor-blocks' ) }
						</>
					) : (
						__( 'Generate', 'ai-editor-blocks' )
					) }
				</Button>
			</div>
		</div>
	);
}
