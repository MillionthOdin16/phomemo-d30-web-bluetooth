/**
 * Template Storage and Management
 * Provides functionality to save, load, and manage label templates
 */

const STORAGE_KEY = "phomemo_templates";
const HISTORY_KEY = "phomemo_print_history";
const SETTINGS_KEY = "phomemo_settings";
const DEVICES_KEY = "phomemo_devices";

/**
 * Template structure
 * @typedef {Object} LabelTemplate
 * @property {string} id - Unique identifier
 * @property {string} name - Template name
 * @property {string} type - Content type (text, barcode, qr, image)
 * @property {Object} content - Content-specific data
 * @property {Object} labelSize - Width and height in mm
 * @property {Object} settings - Print settings
 * @property {number} createdAt - Creation timestamp
 * @property {number} updatedAt - Last update timestamp
 */

/**
 * Print history entry
 * @typedef {Object} PrintHistoryEntry
 * @property {string} id - Unique identifier
 * @property {string} templateName - Name of template used
 * @property {string} type - Content type
 * @property {string} preview - Base64 preview image
 * @property {number} timestamp - Print timestamp
 * @property {boolean} success - Whether print was successful
 */

/**
 * Get all saved templates
 * @returns {LabelTemplate[]}
 */
export const getTemplates = () => {
	try {
		const data = localStorage.getItem(STORAGE_KEY);
		return data ? JSON.parse(data) : [];
	} catch (e) {
		console.error("Failed to load templates:", e);
		return [];
	}
};

/**
 * Save a new template
 * @param {Object} templateData - Template data without id
 * @returns {LabelTemplate} The saved template with id
 */
export const saveTemplate = (templateData) => {
	const templates = getTemplates();
	const template = {
		...templateData,
		id: generateId(),
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};
	templates.push(template);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
	return template;
};

/**
 * Update an existing template
 * @param {string} id - Template id
 * @param {Object} updates - Fields to update
 * @returns {LabelTemplate|null}
 */
export const updateTemplate = (id, updates) => {
	const templates = getTemplates();
	const index = templates.findIndex((t) => t.id === id);
	if (index === -1) return null;

	templates[index] = {
		...templates[index],
		...updates,
		updatedAt: Date.now(),
	};
	localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
	return templates[index];
};

/**
 * Delete a template
 * @param {string} id - Template id
 * @returns {boolean} Success status
 */
export const deleteTemplate = (id) => {
	const templates = getTemplates();
	const filtered = templates.filter((t) => t.id !== id);
	if (filtered.length === templates.length) return false;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
	return true;
};

/**
 * Get template by id
 * @param {string} id - Template id
 * @returns {LabelTemplate|null}
 */
export const getTemplateById = (id) => {
	const templates = getTemplates();
	return templates.find((t) => t.id === id) || null;
};

/**
 * Export templates as JSON
 * @returns {string} JSON string
 */
export const exportTemplates = () => {
	const templates = getTemplates();
	return JSON.stringify(templates, null, 2);
};

/**
 * Import templates from JSON
 * @param {string} jsonString - JSON string
 * @param {boolean} merge - Whether to merge with existing or replace
 * @returns {number} Number of templates imported
 */
export const importTemplates = (jsonString, merge = true) => {
	try {
		const imported = JSON.parse(jsonString);
		if (!Array.isArray(imported)) {
			throw new Error("Invalid template format");
		}

		if (merge) {
			const existing = getTemplates();
			const existingIds = new Set(existing.map((t) => t.id));
			const newTemplates = imported.filter((t) => !existingIds.has(t.id));
			const merged = [...existing, ...newTemplates];
			localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
			return newTemplates.length;
		} else {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
			return imported.length;
		}
	} catch (e) {
		console.error("Failed to import templates:", e);
		throw e;
	}
};

// ================== Print History ==================

/**
 * Get print history
 * @param {number} limit - Maximum entries to return
 * @returns {PrintHistoryEntry[]}
 */
export const getPrintHistory = (limit = 50) => {
	try {
		const data = localStorage.getItem(HISTORY_KEY);
		const history = data ? JSON.parse(data) : [];
		return history.slice(0, limit);
	} catch (e) {
		console.error("Failed to load print history:", e);
		return [];
	}
};

/**
 * Add entry to print history
 * @param {Object} entry - History entry data
 */
export const addToHistory = (entry) => {
	const history = getPrintHistory(100);
	const newEntry = {
		...entry,
		id: generateId(),
		timestamp: Date.now(),
	};
	history.unshift(newEntry);
	// Keep only last 100 entries
	const trimmed = history.slice(0, 100);
	localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
	return newEntry;
};

/**
 * Clear print history
 */
export const clearHistory = () => {
	localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
};

// ================== Settings ==================

/**
 * Get saved settings
 * @returns {Object}
 */
export const getSettings = () => {
	try {
		const data = localStorage.getItem(SETTINGS_KEY);
		return data
			? JSON.parse(data)
			: {
					defaultPrinter: "d30",
					defaultDithering: "floydSteinberg",
					defaultLabelSize: { width: 40, height: 12 },
					autoConnect: false,
					showAdvancedSettings: false,
					darkMode: "auto",
				};
	} catch (e) {
		console.error("Failed to load settings:", e);
		return {};
	}
};

/**
 * Save settings
 * @param {Object} settings - Settings object
 */
export const saveSettings = (settings) => {
	const current = getSettings();
	const merged = { ...current, ...settings };
	localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
	return merged;
};

// ================== Device Management ==================

/**
 * Get saved devices
 * @returns {Object[]}
 */
export const getSavedDevices = () => {
	try {
		const data = localStorage.getItem(DEVICES_KEY);
		return data ? JSON.parse(data) : [];
	} catch (e) {
		console.error("Failed to load devices:", e);
		return [];
	}
};

/**
 * Save a device
 * @param {Object} device - Device info
 */
export const saveDevice = (device) => {
	const devices = getSavedDevices();
	const existing = devices.findIndex((d) => d.id === device.id);
	if (existing >= 0) {
		devices[existing] = { ...devices[existing], ...device, lastUsed: Date.now() };
	} else {
		devices.push({ ...device, lastUsed: Date.now() });
	}
	localStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
};

/**
 * Remove a saved device
 * @param {string} deviceId - Device ID
 */
export const removeDevice = (deviceId) => {
	const devices = getSavedDevices();
	const filtered = devices.filter((d) => d.id !== deviceId);
	localStorage.setItem(DEVICES_KEY, JSON.stringify(filtered));
};

// ================== Utilities ==================

/**
 * Generate unique ID
 * @returns {string}
 */
const generateId = () => {
	return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Get storage usage info
 * @returns {Object}
 */
export const getStorageInfo = () => {
	const templates = localStorage.getItem(STORAGE_KEY) || "";
	const history = localStorage.getItem(HISTORY_KEY) || "";
	const settings = localStorage.getItem(SETTINGS_KEY) || "";
	const devices = localStorage.getItem(DEVICES_KEY) || "";

	const total = templates.length + history.length + settings.length + devices.length;

	return {
		templates: templates.length,
		history: history.length,
		settings: settings.length,
		devices: devices.length,
		total,
		totalKB: (total / 1024).toFixed(2),
	};
};

/**
 * Clear all stored data
 */
export const clearAllData = () => {
	localStorage.removeItem(STORAGE_KEY);
	localStorage.removeItem(HISTORY_KEY);
	localStorage.removeItem(SETTINGS_KEY);
	localStorage.removeItem(DEVICES_KEY);
};
