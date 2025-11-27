/**
 * Voice Control Module
 * Enables hands-free label printing using Web Speech API
 */

export class VoiceControl {
	constructor() {
		this.recognition = null;
		this.isListening = false;
		this.callbacks = {
			onResult: null,
			onCommand: null,
			onError: null,
			onStatusChange: null,
		};
		this.commands = new Map();
		this.init();
	}

	init() {
		// Check for Web Speech API support
		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
		
		if (!SpeechRecognition) {
			console.warn("Speech Recognition not supported in this browser");
			return;
		}

		this.recognition = new SpeechRecognition();
		this.recognition.continuous = false;
		this.recognition.interimResults = true;
		this.recognition.lang = "en-US";

		this.recognition.onresult = (event) => this.handleResult(event);
		this.recognition.onerror = (event) => this.handleError(event);
		this.recognition.onend = () => this.handleEnd();
		this.recognition.onstart = () => this.handleStart();

		// Register default commands
		this.registerDefaultCommands();
	}

	registerDefaultCommands() {
		// Print commands
		this.registerCommand(["print", "print label", "print now", "start printing"], "print");
		this.registerCommand(["print one", "print 1", "one copy"], "print1");
		this.registerCommand(["print three", "print 3", "three copies"], "print3");
		this.registerCommand(["print five", "print 5", "five copies"], "print5");
		this.registerCommand(["print ten", "print 10", "ten copies"], "print10");

		// Tab navigation
		this.registerCommand(["text tab", "go to text", "text mode"], "tab:text");
		this.registerCommand(["barcode tab", "go to barcode", "barcode mode"], "tab:barcode");
		this.registerCommand(["image tab", "go to image", "image mode"], "tab:image");
		this.registerCommand(["qr code tab", "go to qr code", "qr mode"], "tab:qr");
		this.registerCommand(["draw tab", "go to draw", "drawing mode"], "tab:draw");
		this.registerCommand(["templates tab", "go to templates", "template mode"], "tab:templates");

		// Actions
		this.registerCommand(["connect", "connect printer", "connect to printer"], "connect");
		this.registerCommand(["disconnect", "disconnect printer"], "disconnect");
		this.registerCommand(["clear", "clear text", "clear all"], "clear");
		this.registerCommand(["undo", "go back"], "undo");
		this.registerCommand(["redo", "go forward"], "redo");
		this.registerCommand(["save template", "save as template"], "saveTemplate");
		this.registerCommand(["download", "download image", "save image"], "download");

		// Font size
		this.registerCommand(["bigger text", "larger text", "increase font"], "fontBigger");
		this.registerCommand(["smaller text", "smaller font", "decrease font"], "fontSmaller");

		// Presets
		this.registerCommand(["name tag", "name label"], "preset:name");
		this.registerCommand(["price tag", "price label"], "preset:price");
		this.registerCommand(["warning label", "warning tag"], "preset:warning");
		this.registerCommand(["fragile label", "fragile tag"], "preset:fragile");

		// Special - dictation mode
		this.registerCommand(["type", "dictate", "write"], "dictation");
		this.registerCommand(["stop listening", "stop voice", "voice off"], "stop");
	}

	registerCommand(phrases, action) {
		phrases.forEach(phrase => {
			this.commands.set(phrase.toLowerCase(), action);
		});
	}

	start() {
		if (!this.recognition) {
			this.callbacks.onError?.("Speech recognition not supported");
			return false;
		}

		if (this.isListening) {
			return true;
		}

		try {
			this.recognition.start();
			return true;
		} catch (e) {
			this.callbacks.onError?.(e.message);
			return false;
		}
	}

	stop() {
		if (this.recognition && this.isListening) {
			this.recognition.stop();
		}
	}

	handleStart() {
		this.isListening = true;
		this.callbacks.onStatusChange?.(true);
	}

	handleEnd() {
		this.isListening = false;
		this.callbacks.onStatusChange?.(false);
	}

	handleError(event) {
		console.error("Speech recognition error:", event.error);
		this.callbacks.onError?.(event.error);
	}

	handleResult(event) {
		const results = event.results;
		const lastResult = results[results.length - 1];
		const transcript = lastResult[0].transcript.toLowerCase().trim();
		const isFinal = lastResult.isFinal;

		this.callbacks.onResult?.(transcript, isFinal);

		if (isFinal) {
			this.processCommand(transcript);
		}
	}

	processCommand(transcript) {
		// Check for exact command matches
		if (this.commands.has(transcript)) {
			const action = this.commands.get(transcript);
			this.callbacks.onCommand?.(action, transcript);
			return;
		}

		// Check for partial matches
		for (const [phrase, action] of this.commands.entries()) {
			if (transcript.includes(phrase)) {
				this.callbacks.onCommand?.(action, transcript);
				return;
			}
		}

		// Check for "type [text]" or "write [text]" pattern
		const typeMatch = transcript.match(/^(?:type|write|dictate)\s+(.+)$/i);
		if (typeMatch) {
			this.callbacks.onCommand?.("setText", typeMatch[1]);
			return;
		}

		// Check for "set text to [text]" pattern
		const setTextMatch = transcript.match(/^set text (?:to )?(.+)$/i);
		if (setTextMatch) {
			this.callbacks.onCommand?.("setText", setTextMatch[1]);
			return;
		}

		// If no command matched, treat as text input in dictation mode
		this.callbacks.onCommand?.("appendText", transcript);
	}

	on(event, callback) {
		if (event in this.callbacks) {
			this.callbacks[event] = callback;
		}
	}

	isSupported() {
		return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
	}

	getAvailableCommands() {
		const commandList = {};
		for (const [phrase, action] of this.commands.entries()) {
			if (!commandList[action]) {
				commandList[action] = [];
			}
			commandList[action].push(phrase);
		}
		return commandList;
	}
}

// Text-to-Speech for feedback
export class VoiceFeedback {
	constructor() {
		this.synth = window.speechSynthesis;
		this.enabled = true;
		this.voice = null;
		this.rate = 1.0;
		this.pitch = 1.0;
	}

	setVoice(voiceName) {
		const voices = this.synth.getVoices();
		this.voice = voices.find(v => v.name === voiceName) || null;
	}

	speak(text) {
		if (!this.enabled || !this.synth) return;

		// Cancel any ongoing speech
		this.synth.cancel();

		const utterance = new SpeechSynthesisUtterance(text);
		if (this.voice) utterance.voice = this.voice;
		utterance.rate = this.rate;
		utterance.pitch = this.pitch;

		this.synth.speak(utterance);
	}

	confirm(action) {
		const confirmations = {
			print: "Printing label",
			connect: "Connecting to printer",
			disconnect: "Disconnecting",
			saved: "Template saved",
			cleared: "Text cleared",
		};
		this.speak(confirmations[action] || `${action} completed`);
	}

	isSupported() {
		return "speechSynthesis" in window;
	}

	setEnabled(enabled) {
		this.enabled = enabled;
	}
}

export const voiceControl = new VoiceControl();
export const voiceFeedback = new VoiceFeedback();
