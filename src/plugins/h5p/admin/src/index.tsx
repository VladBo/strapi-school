// @ts-nocheck
"use strict";
const jsxRuntime = require("react/jsx-runtime");
const __variableDynamicImportRuntimeHelper = (glob, path, segs) => {
	const v = glob[path];
	if (v) {
		return typeof v === "function" ? v() : Promise.resolve(v);
	}
	return new Promise((_, reject) => {
		(typeof queueMicrotask === "function" ? queueMicrotask : setTimeout)(
			reject.bind(
				null,
				new Error(
					"Unknown variable dynamic import: " +
						path +
						(path.split("/").length !== segs
							? ". Note that variables only represent file names one level deep."
							: ""),
				),
			),
		);
	});
};
const PLUGIN_ID = "h5p";
const H5PIcon = () =>
	/* @__PURE__ */ jsxRuntime.jsxs(
		"svg",
		{
			xmlns: "http://www.w3.org/2000/svg",
			width: "24",
			height: "24",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			children: [
				/* @__PURE__ */ jsxRuntime.jsx("rect", {
					x: "3",
					y: "3",
					width: "18",
					height: "18",
					rx: "2",
					ry: "2",
				}),
				/* @__PURE__ */ jsxRuntime.jsx("path", { d: "M9 3v18" }),
				/* @__PURE__ */ jsxRuntime.jsx("path", { d: "M9 9h6" }),
				/* @__PURE__ */ jsxRuntime.jsx("path", { d: "M9 15h3" }),
			],
		},
	);
const index = {
	register(app) {
		console.log("[H5P Plugin] Registering plugin...");
		app.registerPlugin({
			id: PLUGIN_ID,
			isReady: true,
			name: PLUGIN_ID,
		});
		console.log("[H5P Plugin] Registering H5P Editor custom field...");
		app.customFields.register({
			name: "h5p-editor",
			pluginId: PLUGIN_ID,
			type: "json",
			icon: H5PIcon,
			intlLabel: {
				id: `${PLUGIN_ID}.h5p-editor.label`,
				defaultMessage: "H5P Interactive Content",
			},
			intlDescription: {
				id: `${PLUGIN_ID}.h5p-editor.description`,
				defaultMessage:
					"Create and edit interactive H5P content with a visual editor",
			},
			components: {
				Input: async () =>
					Promise.resolve()
						.then(() => require("../../dist/_chunks/index-Cz7Uqcxe.js"))
						.then((module2) => ({
							default: module2.default,
						})),
			},
		});
		console.log("[H5P Plugin] Custom field registered successfully");
	},
	async registerTrads({ locales }) {
		return Promise.all(
			locales.map(async (locale) => {
				try {
					const { default: data } = await __variableDynamicImportRuntimeHelper(
						/* @__PURE__ */ Object.assign({
							"./translations/en.json": () =>
								Promise.resolve().then(() =>
									require("../../dist/_chunks/en-B4KWt_jN.js"),
								),
						}),
						`./translations/${locale}.json`,
						3,
					);
					return { data, locale };
				} catch {
					return { data: {}, locale };
				}
			}),
		);
	},
};
module.exports = index;
