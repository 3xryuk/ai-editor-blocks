/**
 * AI Edit extension for Gutenberg blocks.
 *
 * This adds an "AI Edit" button to the Block Toolbar for all core blocks.
 * When clicked, it opens a popover where users can enter a prompt to modify
 * the current block using AI.
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { Fragment, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { BlockControls } from '@wordpress/block-editor';
import { ToolbarGroup, ToolbarButton, Popover, TextareaControl, Button, Spinner, Notice } from '@wordpress/components';
import { serialize, parse } from '@wordpress/blocks';
import { useDispatch, useSelect } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';

/**
 * Custom Sparkles icon (SVG) for the AI Edit button.
 */
const sparklesIcon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		width="24"
		height="24"
		aria-hidden="true"
		focusable="false"
	>
		<path d="M9.5 4L11 6.5L13.5 8L11 9.5L9.5 12L8 9.5L5.5 8L8 6.5L9.5 4ZM16.5 10L17.5 12L19.5 13L17.5 14L16.5 16L15.5 14L13.5 13L15.5 12L16.5 10ZM12.5 14L14 17L17 18.5L14 20L12.5 23L11 20L8 18.5L11 17L12.5 14Z" />
	</svg>
);

/**
 * List of blocks that should NOT have the AI Edit button.
 * These are blocks that are dynamic, empty, or don't benefit from AI editing.
 */
const EXCLUDED_BLOCKS = [
	'core/legacy-widget',
	'core/widget-area',
	'core/freeform', // Classic block
	'core/html',     // Custom HTML - could be added later if needed
	'core/shortcode',
];

/**
 * Check if a block should have the AI Edit button.
 *
 * @param {string} blockName - The block name.
 * @return {boolean} True if the block should have the AI Edit button.
 */
function shouldShowAIEdit( blockName ) {
	// Only show for core blocks.
	if ( ! blockName.startsWith( 'core/' ) ) {
		return false;
	}

	// Exclude specific blocks.
	if ( EXCLUDED_BLOCKS.includes( blockName ) ) {
		return false;
	}

	return true;
}

/**
 * AI Edit Button Component.
 *
 * @param {Object} props - Component props.
 * @param {string} props.clientId - The block's clientId.
 * @param {string} props.blockName - The block name.
 * @return {JSX.Element|null} The AI Edit button or null.
 */
function AIEditButton( { clientId, blockName } ) {
	const [ isOpen, setIsOpen ] = useState( false );
	const [ prompt, setPrompt ] = useState( '' );
	const [ isLoading, setIsLoading ] = useState( false );
	const [ error, setError ] = useState( null );

	const { replaceBlocks } = useDispatch( 'core/block-editor' );

	// Get the current block from the data store.
	const block = useSelect( ( select ) => {
		return select( 'core/block-editor' ).getBlock( clientId );
	}, [ clientId ] );

	// Check settings.
	const settings = window.aiebSettings || {};
	const hasSettings = settings.model;

	if ( ! shouldShowAIEdit( blockName ) ) {
		return null;
	}

	/**
	 * Handle the AI generation request.
	 */
	const handleGenerate = async () => {
		if ( ! prompt.trim() || ! block ) {
			return;
		}

		setIsLoading( true );
		setError( null );

		try {
			// Serialize the current block to HTML.
			const serializedBlock = serialize( block );

			// Construct the system prompt for editing.
			const aiSkill = window.aiebSettings?.aiSkill || '';
			const themeData = window.aiebSettings?.themeData || null;
			
			let systemPrompt = `${ aiSkill }

The user wants to modify an existing block. Here is the current block HTML:

${ serializedBlock }

Here is the user's request: ${ prompt }

Maintain the same block type unless the user explicitly requests a different structure.
Use standard core blocks (core/paragraph, core/heading, core/group, core/columns, core/image, etc.).`;

			// Add theme data if available
			if ( themeData ) {
				systemPrompt += `\n\n## Theme Data
Consider the following theme data when modifying the block (e.g., for colors or fonts):
${ JSON.stringify( themeData, null, 2 ) }`;
			}

			// Call the REST API endpoint.
			const response = await apiFetch( {
				path: '/ai-editor-blocks/v1/generate',
				method: 'POST',
				data: {
					prompt: prompt,
					systemPrompt: systemPrompt,
				},
			} );

			// Parse the response into blocks.
			// The API returns: { success: true, data: { choices: [{ message: { content: "..." } }] } }
			let generatedContent = '';

			// Try to extract content from the standard OpenAI response format.
			if ( response.data && response.data.choices && response.data.choices.length > 0 ) {
				const message = response.data.choices[ 0 ].message;
				if ( message && message.content ) {
					generatedContent = message.content;
				}
			}

			// Fallback: try other response formats.
			if ( ! generatedContent ) {
				if ( typeof response === 'string' ) {
					generatedContent = response;
				} else if ( response.content ) {
					generatedContent = response.content;
				} else if ( response.text ) {
					generatedContent = response.text;
				} else if ( response.html ) {
					generatedContent = response.html;
				}
			}

			// Convert to string if not already.
			if ( typeof generatedContent !== 'string' ) {
				generatedContent = String( generatedContent || '' );
			}

			// Clean up the response - remove markdown code blocks if present.
			// More robust regex that handles: ```html, ```, with/without language, spaces, newlines
			generatedContent = generatedContent.replace( /^```[\w]*\s*\n?/gm, '' );
			generatedContent = generatedContent.replace( /\n?```\s*$/gm, '' );

			// Decode HTML entities that may be double-encoded by the API response.
			const textarea = document.createElement( 'textarea' );
			textarea.innerHTML = generatedContent;
			generatedContent = textarea.value;

			// Trim whitespace.
			generatedContent = generatedContent.trim();

			// Check if we have valid content.
			if ( ! generatedContent ) {
				setError( __( 'The AI returned an empty response. Please try again.', 'ai-editor-blocks' ) );
				setIsLoading( false );
				return;
			}

			// Parse the generated content into blocks.
			const parsedBlocks = parse( generatedContent );

			// Debug: Log parsing results for troubleshooting.
			if ( parsedBlocks.length === 0 ) {
				console.warn( 'AIEB: Failed to parse blocks from content:', generatedContent );
			}

			if ( parsedBlocks && parsedBlocks.length > 0 ) {
				// Replace the current block with the generated blocks.
				replaceBlocks( clientId, parsedBlocks );
				// Close the popover and reset state.
				setIsOpen( false );
				setPrompt( '' );
			} else {
				setError( __( 'Could not parse the generated blocks. Please try again.', 'ai-editor-blocks' ) );
			}
		} catch ( err ) {
			console.error( 'AI Edit error:', err );
			setError( err.message || __( 'An error occurred while generating blocks.', 'ai-editor-blocks' ) );
		} finally {
			setIsLoading( false );
		}
	};

	/**
	 * Handle key down events in the textarea.
	 *
	 * @param {KeyboardEvent} event - The keyboard event.
	 */
	const handleKeyDown = ( event ) => {
		// Submit on Ctrl/Cmd + Enter.
		if ( event.key === 'Enter' && ( event.ctrlKey || event.metaKey ) ) {
			event.preventDefault();
			handleGenerate();
		}
		// Close on Escape.
		if ( event.key === 'Escape' ) {
			setIsOpen( false );
		}
	};

	return (
		<BlockControls>
			<ToolbarGroup>
				<ToolbarButton
					icon={ sparklesIcon }
					label={ __( 'Edit with AI', 'ai-editor-blocks' ) }
					onClick={ () => setIsOpen( ! isOpen ) }
					isPressed={ isOpen }
				/>
				{ isOpen && (
					<Popover
						className="aieb-ai-edit-popover"
						position="bottom center"
						onClose={ () => setIsOpen( false ) }
					>
						<div className="aieb-ai-edit-content">
							<h3 className="aieb-ai-edit-title">
								{ __( 'Edit with AI', 'ai-editor-blocks' ) }
							</h3>
							
							{ ! hasSettings && (
								<Notice status="warning" isDismissible={ false }>
									{ __( 'Please configure the plugin settings first.', 'ai-editor-blocks' ) }
								</Notice>
							) }
							
							{ error && (
								<Notice status="error" isDismissible={ false }>
									{ error }
								</Notice>
							) }
							
							<TextareaControl
								label={ __( 'Describe your changes', 'ai-editor-blocks' ) }
								placeholder={ __( 'e.g., Make this text longer, Change background to blue, Turn into 2-column layout...', 'ai-editor-blocks' ) }
								value={ prompt }
								onChange={ ( value ) => setPrompt( value ) }
								onKeyDown={ handleKeyDown }
								disabled={ isLoading || ! hasSettings }
								rows={ 3 }
							/>
							
							<div className="aieb-ai-edit-actions">
								<Button
									variant="secondary"
									onClick={ () => setIsOpen( false ) }
									disabled={ isLoading }
								>
									{ __( 'Cancel', 'ai-editor-blocks' ) }
								</Button>
								<Button
									variant="primary"
									onClick={ handleGenerate }
									disabled={ isLoading || ! prompt.trim() || ! hasSettings }
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
							
							<p className="aieb-ai-edit-hint">
								{ __( 'Press Ctrl+Enter to generate', 'ai-editor-blocks' ) }
							</p>
						</div>
					</Popover>
				) }
			</ToolbarGroup>
		</BlockControls>
	);
}

/**
 * Higher-order component that wraps the block edit component
 * to add the AI Edit button to the toolbar.
 */
const withAIEditButton = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { name, clientId } = props;

		// Don't add the button for excluded blocks or non-core blocks.
		if ( ! shouldShowAIEdit( name ) ) {
			return <BlockEdit { ...props } />;
		}

		return (
			<Fragment>
				<AIEditButton clientId={ clientId } blockName={ name } />
				<BlockEdit { ...props } />
			</Fragment>
		);
	};
}, 'withAIEditButton' );

// Register the filter.
addFilter(
	'editor.BlockEdit',
	'ai-editor-blocks/ai-edit-button',
	withAIEditButton
);
