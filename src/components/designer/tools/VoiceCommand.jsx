import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { LayerFactory } from '../../../lib/layers/factory';

export default function VoiceCommand({ onAction }) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window)) {
            setError('Voice not supported');
            return;
        }
    }, []);

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setTranscript('Listening...');
        };

        recognition.onresult = (event) => {
            const last = event.results.length - 1;
            const text = event.results[last][0].transcript;
            setTranscript(text);
            processCommand(text);
        };

        recognition.onerror = (event) => {
            setError('Error occurred in recognition: ' + event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const stopListening = () => {
        setIsListening(false);
    };

    const processCommand = (text) => {
        const lower = text.toLowerCase();

        if (lower.startsWith("add text") || lower.startsWith("print text")) {
            const content = text.substring(9).trim(); // remove "add text "
            if (content) {
                const layer = LayerFactory.createText();
                layer.content = content;
                onAction('add', layer);
            }
        } else if (lower.includes("print")) {
            onAction('print');
        } else if (lower.includes("clear")) {
            onAction('clear');
        }
    };

    if (error) return null; // Hide if not supported

    return (
        <button
            onClick={toggleListening}
            className={`p-2 rounded flex flex-col items-center text-xs gap-1 ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-gray-100'}`}
            title={transcript}
        >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {isListening ? 'Listening' : 'Voice'}
        </button>
    );
}
