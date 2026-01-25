// @ts-nocheck
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if ((from && typeof from === "object") || typeof from === "function") {
		for (let key of __getOwnPropNames(from))
			if (!__hasOwnProp.call(to, key) && key !== except)
				__defProp(to, key, {
					get: () => from[key],
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
				});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (
	(target = mod != null ? __create(__getProtoOf(mod)) : {}),
	__copyProps(
		// If the importer is in node compatibility mode or this is not an ESM
		// file that has been converted to a CommonJS file using a Babel-
		// compatible transform (i.e. "__esModule" has not been set), then set
		// "default" to the CommonJS "module.exports" for node compatibility.
		isNodeMode || !mod || !mod.__esModule
			? __defProp(target, "default", { value: mod, enumerable: true })
			: target,
		mod,
	)
);
const path = require("path");
const fs = require("fs-extra");
const https = require("https");
const http = require("http");
const AdmZip = require("adm-zip");
const h5pServer = require("@lumieducation/h5p-server");
const _interopDefault = (e) => (e && e.__esModule ? e : { default: e });
const path__default = /* @__PURE__ */ _interopDefault(path);
const fs__default = /* @__PURE__ */ _interopDefault(fs);
const https__default = /* @__PURE__ */ _interopDefault(https);
const http__default = /* @__PURE__ */ _interopDefault(http);
const AdmZip__default = /* @__PURE__ */ _interopDefault(AdmZip);
const bootstrap = async ({ strapi }) => {
	const h5pService = strapi.plugin("h5p").service("service");
	await h5pService.initialize();
	strapi.log.info("H5P plugin bootstrapped");
};
const destroy = ({ strapi }) => {};
const register = ({ strapi }) => {
	strapi.customFields.register({
		name: "h5p-editor",
		plugin: "h5p",
		type: "json",
		// Store H5P content as JSON
	});
};
const config = {
	default: {},
	validator() {},
};
const content = {
	schema: {
		kind: "collectionType",
		collectionName: "h5p_contents",
		info: {
			singularName: "content",
			pluralName: "contents",
			displayName: "H5P Content",
			description: "H5P interactive content",
		},
		options: {
			draftAndPublish: true,
		},
		pluginOptions: {
			"content-manager": {
				visible: true,
			},
			"content-type-builder": {
				visible: false,
			},
		},
		attributes: {
			title: {
				type: "string",
				required: true,
			},
			slug: {
				type: "uid",
				targetField: "title",
			},
			h5pContent: {
				type: "json",
				customField: "plugin::h5p.h5p-editor",
			},
		},
	},
};
const contentTypes = {
	content,
};
const controller = ({ strapi }) => ({
	// Content methods
	async findContent(ctx) {
		try {
			const contents = await strapi
				.documents("api::h5p-content.h5p-content")
				.findMany({
					...ctx.query,
				});
			ctx.body = contents;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async findOneContent(ctx) {
		const { id } = ctx.params;
		try {
			const content2 = await strapi
				.documents("api::h5p-content.h5p-content")
				.findOne({
					documentId: id,
					...ctx.query,
				});
			ctx.body = content2;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async createContent(ctx) {
		try {
			const { title, library, parameters, metadata } = ctx.request.body;
			const slug = title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "");
			const embedCode = `<iframe src="${strapi.config.get("server.url")}/api/h5p/content/${slug}/embed" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;
			const newContent = await strapi
				.documents("api::h5p-content.h5p-content")
				.create({
					data: {
						title,
						slug,
						library,
						parameters,
						metadata,
						embedCode,
					},
				});
			ctx.body = newContent;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async updateContent(ctx) {
		const { id } = ctx.params;
		try {
			const updatedContent = await strapi
				.documents("api::h5p-content.h5p-content")
				.update({
					documentId: id,
					data: ctx.request.body,
				});
			ctx.body = updatedContent;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async deleteContent(ctx) {
		const { id } = ctx.params;
		try {
			const deletedContent = await strapi
				.documents("api::h5p-content.h5p-content")
				.delete({
					documentId: id,
				});
			ctx.body = deletedContent;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	// Library methods
	async getLibraries(ctx) {
		try {
			const h5pService = strapi.plugin("h5p").service("service");
			const libraries = await h5pService.getInstalledLibraries();
			ctx.body = libraries;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async getAvailableLibraries(ctx) {
		try {
			const h5pService = strapi.plugin("h5p").service("service");
			const libraries = await h5pService.getAvailableLibraries();
			ctx.body = libraries;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async installLibrary(ctx) {
		try {
			const h5pService = strapi.plugin("h5p").service("service");
			const { id } = ctx.request.body;
			const result = await h5pService.installLibrary(id);
			ctx.body = result;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async getContentTypeCache(ctx) {
		try {
			const h5pService = strapi.plugin("h5p").service("service");
			const cache = await h5pService.getContentTypeCache();
			ctx.body = cache;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async updateContentTypeCache(ctx) {
		try {
			const h5pService = strapi.plugin("h5p").service("service");
			const cache = await h5pService.updateContentTypeCache();
			ctx.body = cache;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async getContentHubMetadataCache(ctx) {
		try {
			const h5pService = strapi.plugin("h5p").service("service");
			const cache = await h5pService.getContentHubMetadataCache();
			ctx.body = cache;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async updateContentHubMetadataCache(ctx) {
		try {
			const h5pService = strapi.plugin("h5p").service("service");
			const cache = await h5pService.updateContentHubMetadataCache();
			ctx.body = cache;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	// Editor methods
	async getEditorPage(ctx) {
		try {
			const h5pService = strapi.plugin("h5p").service("service");
			const html = await h5pService.renderEditor(ctx.params.contentId);
			ctx.type = "text/html";
			ctx.body = html;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async getContentParams(ctx) {
		try {
			const h5pService = strapi.plugin("h5p").service("service");
			const params = await h5pService.getContentParams(ctx.params.contentId);
			ctx.body = params;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async saveContent(ctx) {
		try {
			const h5pService = strapi.plugin("h5p").service("service");
			const result = await h5pService.saveContent(ctx.request.body);
			ctx.body = result;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async getLibraryFile(ctx) {
		try {
			const h5pService = strapi.plugin("h5p").service("service");
			const file = await h5pService.getLibraryFile(
				ctx.params.ubername,
				ctx.params.file,
			);
			ctx.type = file.mimeType;
			ctx.body = file.stream;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async getContentFile(ctx) {
		try {
			const h5pService = strapi.plugin("h5p").service("service");
			const file = await h5pService.getContentFile(
				ctx.params.contentId,
				ctx.params.file,
			);
			ctx.type = file.mimeType;
			ctx.body = file.stream;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async getCoreFile(ctx) {
		try {
			const h5pService = strapi.plugin("h5p").service("service");
			const file = await h5pService.getCoreFile(ctx.params.type, ctx.params.file);
			ctx.type = file.mimeType;
			ctx.body = file.stream;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async getEditorFile(ctx) {
		try {
			const h5pService = strapi.plugin("h5p").service("service");
			const file = await h5pService.getEditorFile(ctx.params.type, ctx.params.file);
			ctx.type = file.mimeType;
			ctx.body = file.stream;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async getPlayPage(ctx) {
		try {
			const h5pService = strapi.plugin("h5p").service("service");
			const html = await h5pService.renderPlayer(ctx.params.contentId);
			ctx.type = "text/html";
			ctx.body = html;
		} catch (err) {
			ctx.throw(500, err);
		}
	},
	async getAjax(ctx) {
		try {
			const h5pService = strapi.plugin("h5p").service("service");
			const { method } = ctx.request;
			const action = ctx.query.action || (ctx.request.body && ctx.request.body.action);
			const result = await h5pService.handleAjax({
				action,
				method,
				query: ctx.query,
				body: ctx.request.body,
				files: ctx.request.files,
			});
			if (result && result.body !== void 0) {
				if (result.contentType) {
					ctx.type = result.contentType;
				}
				if (result.status) {
					ctx.status = result.status;
				}
				ctx.body = result.body;
			} else {
				ctx.body = result;
			}
		} catch (err) {
			ctx.throw(500, err);
		}
	},
});
const controllers = {
	controller,
};
const routes = [
	{
		method: "GET",
		path: "/contents",
		handler: "controller.findContent",
		config: {
			auth: false,
		},
	},
	{
		method: "GET",
		path: "/contents/:id",
		handler: "controller.findOneContent",
		config: {
			auth: false,
		},
	},
	{
		method: "POST",
		path: "/contents",
		handler: "controller.createContent",
		config: {
			auth: false,
		},
	},
	{
		method: "PUT",
		path: "/contents/:id",
		handler: "controller.updateContent",
		config: {
			auth: false,
		},
	},
	{
		method: "DELETE",
		path: "/contents/:id",
		handler: "controller.deleteContent",
		config: {
			auth: false,
		},
	},
	{
		method: "GET",
		path: "/libraries",
		handler: "controller.getLibraries",
		config: {
			auth: false,
		},
	},
	{
		method: "GET",
		path: "/libraries/available",
		handler: "controller.getAvailableLibraries",
		config: {
			auth: false,
		},
	},
	{
		method: "POST",
		path: "/libraries/install",
		handler: "controller.installLibrary",
		config: {
			auth: false,
		},
	},
	{
		method: "GET",
		path: "/ajax",
		handler: "controller.getAjax",
		config: {
			auth: false,
		},
	},
	{
		method: "POST",
		path: "/ajax",
		handler: "controller.getAjax",
		config: {
			auth: false,
		},
	},
	{
		method: "GET",
		path: "/editor-page/:contentId",
		handler: "controller.getEditorPage",
		config: {
			auth: false,
		},
	},
	{
		method: "GET",
		path: "/params/:contentId",
		handler: "controller.getContentParams",
		config: {
			auth: false,
		},
	},
	{
		method: "POST",
		path: "/save",
		handler: "controller.saveContent",
		config: {
			auth: false,
		},
	},
	{
		method: "GET",
		path: "/libraries/:ubername/:file*",
		handler: "controller.getLibraryFile",
		config: {
			auth: false,
		},
	},
	{
		method: "GET",
		path: "/content/:contentId/:file*",
		handler: "controller.getContentFile",
		config: {
			auth: false,
		},
	},
	{
		method: "GET",
		path: "/core/:type/:file*",
		handler: "controller.getCoreFile",
		config: {
			auth: false,
		},
	},
	{
		method: "GET",
		path: "/editor/:type/:file*",
		handler: "controller.getEditorFile",
		config: {
			auth: false,
		},
	},
	{
		method: "GET",
		path: "/play/:contentId",
		handler: "controller.getPlayPage",
		config: {
			auth: false,
		},
	},
	{
		method: "GET",
		path: "/content-type-cache",
		handler: "controller.getContentTypeCache",
		config: {
			auth: false,
		},
	},
	{
		method: "POST",
		path: "/content-type-cache",
		handler: "controller.updateContentTypeCache",
		config: {
			auth: false,
		},
	},
	{
		method: "GET",
		path: "/content-hub-metadata-cache",
		handler: "controller.getContentHubMetadataCache",
		config: {
			auth: false,
		},
	},
	{
		method: "POST",
		path: "/content-hub-metadata-cache",
		handler: "controller.updateContentHubMetadataCache",
		config: {
			auth: false,
		},
	},
];
const policies = [];
const middlewares = [];
const service = ({ strapi }) => ({
	/**
	 * H5P Editor and Player Implementation
	 * This is a custom implementation to make H5P work with Strapi (Koa)
	 */
	async initialize() {
		strapi.log.info("Initializing H5P Editor and Player...");
		const config2 = strapi.config.get("plugin.h5p");
		const h5pConfig = {
			baseUrl: "/api/h5p",
			editorUrl: "/api/h5p/editor",
			coreUrl: "/api/h5p/core",
			// Use content type cache
			contentTypeCacheUrl: "/api/h5p/ajax?action=content-type-cache",
			contentHubMetadataUrl: "/api/h5p/ajax?action=content-hub-metadata-cache",
			// Enable hub
			enableHub: true,
			// Store paths
			contentStorage: {
				libraryPath: path__default.default.join(
					strapi.dirs.static.public,
					config2.config.librariesPath || "h5p/libraries",
				),
				contentPath: path__default.default.join(
					strapi.dirs.static.public,
					config2.config.contentPath || "h5p/content",
				),
				temporaryPath: path__default.default.join(
					strapi.dirs.static.public,
					config2.config.temporaryFilesPath || "h5p/temp-files",
				),
			},
		};
		this.h5pConfig = h5pConfig;
		// Ensure directories exist
		await fs__default.default.ensureDir(h5pConfig.contentStorage.libraryPath);
		await fs__default.default.ensureDir(h5pConfig.contentStorage.contentPath);
		await fs__default.default.ensureDir(h5pConfig.contentStorage.temporaryPath);
		// Initialize H5P server
		this.h5pEditor = new h5pServer.H5PEditor(
			h5pConfig.contentStorage,
			new h5pServer.H5PConfig(),
			h5pConfig,
		);
		this.h5pPlayer = new h5pServer.H5PPlayer(
			h5pConfig.contentStorage,
			new h5pServer.H5PConfig(),
			h5pConfig,
		);
		strapi.log.info("✅ H5P Editor and Player initialized successfully");
	},
	/**
	 * Get installed libraries
	 */
	async getInstalledLibraries() {
		try {
			const libraries = await this.h5pEditor.libraryStorage.getInstalledLibraries();
			return libraries;
		} catch (error) {
			strapi.log.error("Failed to get installed libraries:", error);
			throw error;
		}
	},
	/**
	 * Get available libraries from content hub
	 */
	async getAvailableLibraries() {
		try {
			const libraries = await this.h5pEditor.contentHub.getLibraries();
			return libraries;
		} catch (error) {
			strapi.log.error("Failed to get available libraries:", error);
			throw error;
		}
	},
	/**
	 * Install library from content hub
	 */
	async installLibrary(libraryId) {
		try {
			const result = await this.h5pEditor.contentHub.installLibrary(libraryId);
			return { success: true, result };
		} catch (error) {
			strapi.log.error("Failed to install library:", error);
			throw error;
		}
	},
	/**
	 * Get content type cache
	 */
	async getContentTypeCache() {
		try {
			const cache = await this.h5pEditor.contentTypeCache.get();
			return cache;
		} catch (error) {
			strapi.log.error("Failed to get content type cache:", error);
			throw error;
		}
	},
	/**
	 * Update content type cache
	 */
	async updateContentTypeCache() {
		try {
			const cache = await this.h5pEditor.contentTypeCache.update();
			return cache;
		} catch (error) {
			strapi.log.error("Failed to update content type cache:", error);
			throw error;
		}
	},
	/**
	 * Get content hub metadata cache
	 */
	async getContentHubMetadataCache() {
		try {
			const cache = await this.h5pEditor.contentHubMetadataCache.get();
			return cache;
		} catch (error) {
			strapi.log.error("Failed to get content hub metadata cache:", error);
			throw error;
		}
	},
	/**
	 * Update content hub metadata cache
	 */
	async updateContentHubMetadataCache() {
		try {
			const cache = await this.h5pEditor.contentHubMetadataCache.update();
			return cache;
		} catch (error) {
			strapi.log.error("Failed to update content hub metadata cache:", error);
			throw error;
		}
	},
	/**
	 * Handle H5P AJAX requests
	 */
	async handleAjax({ action, method, query, body, files }) {
		try {
			const req = {
				method,
				query,
				body,
				files,
			};
			const res = {};
			const ajaxEndpoint = new h5pServer.H5PAjaxEndpoint(this.h5pEditor);
			const result = await ajaxEndpoint.handle(req, res, action);
			return result;
		} catch (error) {
			strapi.log.error("Failed to handle H5P AJAX request:", error);
			throw error;
		}
	},
	/**
	 * Get content parameters
	 */
	async getContentParams(contentId) {
		try {
			const params = await this.h5pEditor.contentStorage.get(contentId);
			return params;
		} catch (error) {
			strapi.log.error(`Failed to get content params for ${contentId}:`, error);
			throw error;
		}
	},
	/**
	 * Save content
	 */
	async saveContent(contentData) {
		try {
			const { library, params, metadata } = contentData;
			const contentId = await this.h5pEditor.saveOrUpdateContent(
				library,
				params,
				metadata,
			);
			return { id: contentId };
		} catch (error) {
			strapi.log.error("Failed to save content:", error);
			throw error;
		}
	},
	/**
	 * Get library file
	 */
	async getLibraryFile(ubername, file) {
		try {
			const filePath = path__default.default.join(
				this.h5pConfig.contentStorage.libraryPath,
				ubername,
				file,
			);
			if (!fs__default.default.existsSync(filePath)) {
				throw new Error(`File not found: ${filePath}`);
			}
			const mimeType = this.getMimeType(filePath);
			const stream = fs__default.default.createReadStream(filePath);
			return { stream, mimeType };
		} catch (error) {
			strapi.log.error("Failed to get library file:", error);
			throw error;
		}
	},
	/**
	 * Get content file
	 */
	async getContentFile(contentId, file) {
		try {
			const filePath = path__default.default.join(
				this.h5pConfig.contentStorage.contentPath,
				contentId,
				file,
			);
			if (!fs__default.default.existsSync(filePath)) {
				throw new Error(`File not found: ${filePath}`);
			}
			const mimeType = this.getMimeType(filePath);
			const stream = fs__default.default.createReadStream(filePath);
			return { stream, mimeType };
		} catch (error) {
			strapi.log.error("Failed to get content file:", error);
			throw error;
		}
	},
	/**
	 * Get core file
	 */
	async getCoreFile(type, file) {
		try {
			const filePath = path__default.default.join(
				this.h5pConfig.contentStorage.libraryPath,
				"core",
				type,
				file,
			);
			if (!fs__default.default.existsSync(filePath)) {
				throw new Error(`File not found: ${filePath}`);
			}
			const mimeType = this.getMimeType(filePath);
			const stream = fs__default.default.createReadStream(filePath);
			return { stream, mimeType };
		} catch (error) {
			strapi.log.error("Failed to get core file:", error);
			throw error;
		}
	},
	/**
	 * Get editor file
	 */
	async getEditorFile(type, file) {
		try {
			const filePath = path__default.default.join(
				this.h5pConfig.contentStorage.libraryPath,
				"editor",
				type,
				file,
			);
			if (!fs__default.default.existsSync(filePath)) {
				throw new Error(`File not found: ${filePath}`);
			}
			const mimeType = this.getMimeType(filePath);
			const stream = fs__default.default.createReadStream(filePath);
			return { stream, mimeType };
		} catch (error) {
			strapi.log.error("Failed to get editor file:", error);
			throw error;
		}
	},
	/**
	 * Render H5P player
	 */
	async renderPlayer(contentId) {
		try {
			const coreAssets = await this.h5pPlayer.listCoreFiles();
			const playerAssets = await this.h5pPlayer.listPlayerFiles();
			const { html: h5pHtml } = await this.h5pPlayer.render(contentId);
			const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>H5P Content</title>
	${coreAssets.styles
		.map(
			(style) =>
				`<link rel="stylesheet" href="${this.h5pConfig.coreUrl}/${style}">`,
		)
		.join("\n")}
	${playerAssets.styles
		.map(
			(style) =>
				`<link rel="stylesheet" href="${this.h5pConfig.baseUrl}/content/${contentId}/${style}">`,
		)
		.join("\n")}
</head>
<body>
	<div class="h5p-content">
		${h5pHtml}
	</div>
	${coreAssets.scripts
		.map((script) => `<script src="${this.h5pConfig.coreUrl}/${script}"></script>`)
		.join("\n")}
	${playerAssets.scripts
		.map(
			(script) =>
				`<script src="${this.h5pConfig.baseUrl}/content/${contentId}/${script}"></script>`,
		)
		.join("\n")}
</body>
</html>`;
			return html;
		} catch (error) {
			strapi.log.error(`Failed to render H5P player for ${contentId}:`, error);
			throw error;
		}
	},
	/**
	 * Render H5P editor
	 */
	async renderEditor(contentId) {
		try {
			let editorContentId = contentId;
			const isNew = contentId === "new";
			if (isNew) {
				editorContentId = null;
			}
			const coreAssets = await this.h5pEditor.listCoreFiles();
			const editorAssets = await this.h5pEditor.listEditorFiles();
			const { html: h5pHtml, integration } = await this.h5pEditor.render(
				editorContentId,
			);
			const fullIntegration = await this.h5pEditor.generateIntegration(
				editorContentId,
			);
			const mergedIntegration = {
				...integration,
				...fullIntegration,
				ajaxPath: `${this.h5pConfig.baseUrl}/ajax`,
				hubContentTypesPath: `${this.h5pConfig.baseUrl}/ajax?action=content-type-cache`,
				hubMetadataPath: `${this.h5pConfig.baseUrl}/ajax?action=content-hub-metadata-cache`,
			};
			const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>H5P Editor</title>
	<style>
		html, body, .h5p-editor-wrapper, .h5p-create, .h5p-editor {
			width: 100%;
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			overflow-x: hidden;
		}
		.h5p-editor {
			min-height: 400px;
		}
	</style>
	${coreAssets.styles
		.map(
			(style) =>
				`<link rel="stylesheet" href="${this.h5pConfig.coreUrl}/${style}">`,
		)
		.join("\n")}
	${editorAssets.styles
		.map(
			(style) =>
				`<link rel="stylesheet" href="${this.h5pConfig.editorUrl}/${style}">`,
		)
		.join("\n")}
</head>
<body>
	<div class="h5p-editor-wrapper">
		${h5pHtml}
	</div>

	<script>
		// Set up H5P integration
		window.H5PIntegration = ${JSON.stringify(mergedIntegration)};

		// Ensure H5P and H5PEditor objects exist
		window.H5P = window.H5P || {};
		window.H5PEditor = window.H5PEditor || {};

		// Set base paths
		window.H5PIntegration.baseUrl = '${this.h5pConfig.baseUrl}';
		window.H5PIntegration.url = '${this.h5pConfig.baseUrl}';
		window.H5PIntegration.ajaxPath = '${this.h5pConfig.baseUrl}/ajax';
		window.H5PIntegration.saveFreq = false;
		window.H5PIntegration.postUserStatistics = false;
		window.H5PIntegration.libraryUrl = '${this.h5pConfig.baseUrl}/libraries';
		window.H5PIntegration.embedUrl = '${this.h5pConfig.baseUrl}/play';
		window.H5PIntegration.l10n = window.H5PIntegration.l10n || {};
		window.H5PIntegration.l10n.editor = window.H5PIntegration.l10n.editor || {};
		window.H5PIntegration.l10n.editor.locale = window.H5PIntegration.l10n.editor.locale || 'en';

		// Ensure library path for editor
		window.H5PEditor.basePath = '${this.h5pConfig.editorUrl}';
		window.H5PEditor.libraryPath = '${this.h5pConfig.baseUrl}/libraries';
		window.H5PEditor.fileIcon = '${this.h5pConfig.editorUrl}/images/binary-file.png';
		window.H5PEditor.ajaxPath = '${this.h5pConfig.baseUrl}/ajax';
		window.H5PEditor.filesPath = '${this.h5pConfig.baseUrl}/content';
		window.H5PEditor.contentId = '${editorContentId || 0}';

		// Register H5P editor assets
		window.H5PIntegration.core = window.H5PIntegration.core || {};
		window.H5PIntegration.core.styles = ${JSON.stringify(coreAssets.styles)}.map(function(style) {
			return '${this.h5pConfig.coreUrl}/' + style;
		});
		window.H5PIntegration.core.scripts = ${JSON.stringify(coreAssets.scripts)}.map(function(script) {
			return '${this.h5pConfig.coreUrl}/' + script;
		});

		window.H5PIntegration.editor = window.H5PIntegration.editor || {};
		window.H5PIntegration.editor.styles = ${JSON.stringify(editorAssets.styles)}.map(function(style) {
			return '${this.h5pConfig.editorUrl}/' + style;
		});
		window.H5PIntegration.editor.scripts = ${JSON.stringify(editorAssets.scripts)}.map(function(script) {
			return '${this.h5pConfig.editorUrl}/' + script;
		});

		window.H5PIntegration.loadedJs = [];
		window.H5PIntegration.loadedCss = [];

		// Load scripts in sequence to ensure proper initialization
		(function() {
			var allScripts = [];
			if (window.H5PIntegration.core && window.H5PIntegration.core.scripts) {
				allScripts = allScripts.concat(window.H5PIntegration.core.scripts);
			}
			if (window.H5PIntegration.editor && window.H5PIntegration.editor.scripts) {
				allScripts = allScripts.concat(window.H5PIntegration.editor.scripts);
			}
			console.log('Loading H5P scripts:', allScripts);
			var loadedCount = 0;

			function loadScriptSequentially() {
				if (loadedCount >= allScripts.length) {
					console.log('All H5P scripts loaded');
					window.H5PIntegration.loadedJs = allScripts;

					// Initialize H5P editor when scripts are loaded
					if (window.H5PEditor && window.H5PEditor.init) {
						console.log('Initializing H5P Editor...');
						window.H5PEditor.init();
					} else {
						console.error('H5PEditor.init not available');
					}

					// Ensure H5P editor is properly initialized
					if (!window.H5P || !window.H5PEditor) {
						console.error('H5P or H5PEditor objects not available');
						return;
					}

					console.log('H5PEditor properties initialized:', {
						basePath: H5PEditor.basePath,
						ajaxPath: H5PEditor.ajaxPath,
						assetsCSS: H5PEditor.assets.css.length,
						assetsJS: H5PEditor.assets.js.length
					});

					// Initialize the H5P Editor properly
					try {
						// Get the editor container
						var editorContainer = document.querySelector('.h5p-editor');
						if (!editorContainer) {
							console.error('Editor container .h5p-editor not found');
							return;
						}

						// For new content, library and params are empty
						var library = '';
						var defaultParams = '{}';

						console.log('Creating H5PEditor.Editor instance...');

						// Create the editor instance
						// The Editor constructor expects: (library, defaultParams, replaceElement, iframeLoaded)
						window.h5peditor = new H5PEditor.Editor(library, defaultParams, editorContainer, function() {
							console.log('H5P Editor iframe loaded');
						});

						console.log('H5P Editor instance created');

					} catch (e) {
						console.error('Error initializing H5P Editor:', e.message);
						console.error(e.stack);
					}

					if (window.parent && window.parent !== window) {
						window.parent.postMessage({ type: 'h5p-editor-loaded' }, '*');
					}
					return;
				}

				var script = document.createElement('script');
				var currentScript = allScripts[loadedCount];
				script.src = currentScript + '&cacheBust=' + Date.now();
				script.onload = function() {
					console.log('Loaded: ' + currentScript);
					// After jQuery loads, ensure H5P.jQuery is available
					// H5P's jQuery sets H5P.jQuery directly, not window.jQuery
					if (currentScript.indexOf('jquery.js') !== -1) {
						var jq = window.H5P.jQuery || window.jQuery;
						if (typeof jq === 'function') {
							window.H5P.jQuery = jq;
							window.H5PEditor.$ = jq;
							window.jQuery = window.jQuery || jq;
							window.$ = window.$ || jq;
							console.log('H5P.jQuery set after jQuery loaded');
						}
					}
					loadedCount++;
					loadScriptSequentially();
				};
				script.onerror = function() {
					console.error('Failed to load: ' + allScripts[loadedCount]);
					loadedCount++;
					loadScriptSequentially();
				};
				document.body.appendChild(script);
			}

			// Start loading scripts
			console.log('Starting script loading, total:', allScripts.length);
			loadScriptSequentially();
		})();
	</script>
</body>
</html>`;
			return html;
		} catch (error) {
			strapi.log.error("Failed to render H5P editor:", error);
			throw error;
		}
	},
	/**
	 * Read file from filesystem
	 */
	async readFile(filePath) {
		try {
			return await fs__default.default.readFile(filePath);
		} catch (error) {
			strapi.log.error(`Failed to read file ${filePath}:`, error);
			throw error;
		}
	},
	/**
	 * Download and install libraries from H5P Hub
	 */
	async downloadLibraries() {
		try {
			strapi.log.info("Downloading H5P libraries...");
			// Define essential libraries to download
			const essentialLibraries = [
				"H5P.MultiChoice",
				"H5P.QuestionSet",
				"H5P.InteractiveVideo",
				"H5P.CoursePresentation",
				"H5P.DragQuestion",
				"H5P.Blanks",
				"H5P.TrueFalse",
			];
			// Get available libraries
			const availableLibraries = await this.h5pEditor.contentHub.getLibraries();
			// Filter for essential libraries
			const librariesToDownload = availableLibraries.filter((lib) =>
				essentialLibraries.includes(lib.machineName),
			);
			strapi.log.info(
				`Found ${librariesToDownload.length} essential libraries to download`,
			);
			// Download and install each library
			for (const lib of librariesToDownload) {
				try {
					strapi.log.info(`Downloading ${lib.machineName}...`);
					await this.h5pEditor.contentHub.installLibrary(lib.id);
					strapi.log.info(`✅ Installed ${lib.machineName}`);
				} catch (error) {
					strapi.log.error(`Failed to install ${lib.machineName}:`, error);
				}
			}
			strapi.log.info("✅ H5P libraries download completed");
			return { success: true, count: librariesToDownload.length };
		} catch (error) {
			strapi.log.error("Failed to download H5P libraries:", error);
			throw error;
		}
	},
	/**
	 * Install H5P libraries from a ZIP file
	 */
	async installFromZip(zipFilePath) {
		try {
			strapi.log.info(`Installing H5P libraries from ${zipFilePath}...`);
			if (!fs__default.default.existsSync(zipFilePath)) {
				throw new Error(`ZIP file not found: ${zipFilePath}`);
			}
			// Read ZIP file
			const zip = new AdmZip__default.default(zipFilePath);
			const zipEntries = zip.getEntries();
			// Extract to temporary directory
			const tempDir = path__default.default.join(
				this.h5pConfig.contentStorage.temporaryPath,
				`h5p-lib-${Date.now()}`,
			);
			await fs__default.default.ensureDir(tempDir);
			zip.extractAllTo(tempDir, true);
			// Check if it's a library or content
			const isLibrary = zipEntries.some((entry) =>
				entry.entryName.endsWith("library.json"),
			);
			if (isLibrary) {
				// Install library
				const result = await this.h5pEditor.libraryStorage.addLibraryFromDirectory(
					tempDir,
				);
				strapi.log.info("✅ Library installed successfully");
				return { success: true, result };
			} else {
				// Install content
				const result = await this.h5pEditor.contentStorage.addContentFromDirectory(
					tempDir,
				);
				strapi.log.info("✅ Content installed successfully");
				return { success: true, result };
			}
		} catch (error) {
			strapi.log.error("Failed to install from ZIP:", error);
			throw error;
		}
	},
	/**
	 * Determine MIME type based on file extension
	 */
	getMimeType(filePath) {
		const ext = path__default.default.extname(filePath).toLowerCase();
		switch (ext) {
			case ".js":
				return "application/javascript";
			case ".css":
				return "text/css";
			case ".json":
				return "application/json";
			case ".png":
				return "image/png";
			case ".jpg":
			case ".jpeg":
				return "image/jpeg";
			case ".gif":
				return "image/gif";
			case ".svg":
				return "image/svg+xml";
			case ".woff":
				return "font/woff";
			case ".woff2":
				return "font/woff2";
			case ".ttf":
				return "font/ttf";
			case ".eot":
				return "application/vnd.ms-fontobject";
			case ".otf":
				return "font/otf";
			case ".mp4":
				return "video/mp4";
			case ".webm":
				return "video/webm";
			case ".ogg":
				return "audio/ogg";
			case ".mp3":
				return "audio/mpeg";
			case ".wav":
				return "audio/wav";
			default:
				return "application/octet-stream";
		}
	},
});
const services = {
	service,
};
const index = {
	register,
	bootstrap,
	destroy,
	config,
	controllers,
	routes,
	services,
	contentTypes: {}, // Disabled - using content-type from src/api/h5p-content
	policies,
	middlewares,
};
module.exports = index;
