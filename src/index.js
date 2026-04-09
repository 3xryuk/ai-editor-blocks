import { registerBlockType } from '@wordpress/blocks';
import './style.scss';
import Edit from './edit';
import save from './save';
import metadata from './block.json';

// Import extensions for core blocks.
import './extensions/group-interactive';
import './extensions/block-ai-edit';

registerBlockType( metadata.name, {
	edit: Edit,
	save,
} );
