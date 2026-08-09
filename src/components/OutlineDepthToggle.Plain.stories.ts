import type { Meta, StoryObj } from "@storybook/vue3-vite";

import OutlineDepthToggle from "./OutlineDepthToggle.Plain.vue";

const hideArg = { table: { disable: true } } as const;
const depthValues = { type: "range", min: 2, max: 6, step: 1 } as const;

const meta = {
	component: OutlineDepthToggle,
	argTypes: {
		defaultDepth: hideArg,
		defaultAutoExpand: hideArg,
		depth: { control: depthValues },
		minDepth: { control: depthValues },
		maxDepth: { control: depthValues },
		autoExpand: { control: "boolean" },
		locales: hideArg,
		depthLabel: { control: "text" },
		autoExpandLabel: { control: "text" },
	},
} satisfies Meta<typeof OutlineDepthToggle & any>;

export default meta;
type Story = StoryObj<typeof meta & any>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
	render: (_args: any) => ({
		components: { OutlineDepthToggle },
		setup() {
			const { depthLabel: depth, autoExpandLabel: autoExpand, ...args } = _args;
			return { args: { ...args, locales: { depth, autoExpand } } };
		},
		template: '<OutlineDepthToggle v-bind="args" />',
	}),
	args: {
		minDepth: 2,
		depth: 2,
		autoExpand: true,
		depthLabel: "Outline depth",
		autoExpandLabel: "Auto expand",
		maxDepth: 6,
	},
};
