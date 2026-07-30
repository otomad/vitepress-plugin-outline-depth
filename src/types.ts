export type AvailableDepthValue = 2 | 3 | 4 | 5 | 6;

export interface OutlineDepthPluginOptions {
	/**
	 * Set the default value of the Outline Depth.
	 *
	 * @default 2
	 */
	defaultDepth?: AvailableDepthValue;
	/**
	 * Set the default value of the Auto Expand.
	 *
	 * @default true
	 */
	defaultAutoExpand?: boolean;
	/**
	 * Localize the labels.
	 */
	locales?: Record<
		string,
		{
			/**
			 * Specify the localized label text for the Outline Depth.
			 *
			 * @default
			 * ```markdown
			 * - en: Outline depth
			 * - zh: 目录层级
			 * ```
			 */
			depth: string;
			/**
			 * Specify the localized label text for the Auto Expand.
			 *
			 * @default
			 * ```markdown
			 * - en: Auto expand
			 * - zh: 自动展开
			 * ```
			 */
			autoExpand: string;
		}
	>;
	/**
	 * Save the config to local storage?
	 *
	 * @default true
	 */
	saveToLocalStorage?: boolean;
	/**
	 * Set the minimum value of the Outline Depth can be set.
	 *
	 * @default 2
	 */
	minDepth?: AvailableDepthValue;
	/**
	 * Set the maximum value of the Outline Depth can be set.
	 *
	 * @default 6
	 */
	maxDepth?: AvailableDepthValue;
	/**
	 * Stick the Outline Depth Toggle component at the top of the outline aside?
	 *
	 * @default true
	 */
	stickAtTop?: boolean;
	/**
	 * Automatically scroll the outline active outline link (or outline marker) into view when scrolling?
	 *
	 * @default true
	 */
	scrollActiveOutlineLinkIntoView?: boolean;
	/**
	 * Automatically set the default theme configuration `themeConfig.outline.level` to the `"deep"` value in every
	 * locales?
	 *
	 * @default true
	 */
	setConfigOutlineLevelToDeep?: boolean;
}

export interface OutlineDepthLocalStorageConfigs {
	/**
	 * Set the value of the Outline Depth.
	 */
	depth: AvailableDepthValue;
	/**
	 * Set the value of the Auto Expand.
	 */
	autoExpand: boolean;
}
