// Domain Voice Changer - Frontend Application

class VoiceChangerApp {
    constructor() {
        this.currentAudioFile = null;
        this.selectedVoice = 'alloy';
        this.selectedEffect = null;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioContext = null;
        this.analyser = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadVoices();
        this.loadEffects();
        this.initializeAudioVisualizer();
    }

    initializeElements() {
        // Recording elements
        this.recordBtn = document.getElementById('recordBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.waveformCanvas = document.getElementById('waveform');
        
        // Upload elements
        this.audioUpload = document.getElementById('audioUpload');
        this.uploadArea = document.getElementById('uploadArea');
        
        // Current audio elements
        this.currentAudioPanel = document.getElementById('currentAudioPanel');
        this.currentFileName = document.getElementById('currentFileName');
        this.currentAudioPlayer = document.getElementById('currentAudioPlayer');
        this.transcribeBtn = document.getElementById('transcribeBtn');
        this.transcriptionResult = document.getElementById('transcriptionResult');
        
        // Transformation elements
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.ttsTab = document.getElementById('ttsTab');
        this.effectsTab = document.getElementById('effectsTab');
        this.ttsText = document.getElementById('ttsText');
        this.voiceGrid = document.getElementById('voiceGrid');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        this.generateTtsBtn = document.getElementById('generateTtsBtn');
        this.effectsGrid = document.getElementById('effectsGrid');
        this.effectParams = document.getElementById('effectParams');
        this.applyEffectBtn = document.getElementById('applyEffectBtn');
        
        // Results elements
        this.resultsPanel = document.getElementById('resultsPanel');
        this.resultsList = document.getElementById('resultsList');
        
        // UI elements
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingText = document.getElementById('loadingText');
        this.toastContainer = document.getElementById('toastContainer');
    }

    bindEvents() {
        // Recording events
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        
        // Upload events
        this.audioUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', () => this.handleDragLeave());
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Current audio events
        this.transcribeBtn.addEventListener('click', () => this.transcribeAudio());
        
        // Tab events
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // TTS events
        this.speedSlider.addEventListener('input', (e) => {
            this.speedValue.textContent = `${e.target.value}x`;
        });
        this.generateTtsBtn.addEventListener('click', () => this.generateTTS());
        
        // Effect events
        this.applyEffectBtn.addEventListener('click', () => this.applyEffect());
    }

    // Recording functionality
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                const formData = new FormData();
                formData.append('audio', audioBlob, 'recording.wav');
                
                try {
                    const response = await fetch('/api/upload_audio', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await response.json();
                    if (data.file) {
                        this.setCurrentAudio(data.file, data.filename);
                        this.showToast('Recording saved successfully', 'success');
                    }
                } catch (error) {
                    this.showToast('Failed to save recording', 'error');
                }
                
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateRecordingUI();
            this.startAudioVisualization(stream);
            
        } catch (error) {
            this.showToast('Failed to access microphone', 'error');
            console.error('Recording error:', error);
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.updateRecordingUI();
            this.stopAudioVisualization();
        }
    }

    updateRecordingUI() {
        if (this.isRecording) {
            this.recordBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.recordingIndicator.classList.add('active');
        } else {
            this.recordBtn.disabled = false;
            this.stopBtn.disabled = true;
            this.recordingIndicator.classList.remove('active');
        }
    }

    // Audio visualization
    initializeAudioVisualizer() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.canvasContext = this.waveformCanvas.getContext('2d');
        this.waveformCanvas.width = this.waveformCanvas.offsetWidth;
        this.waveformCanvas.height = this.waveformCanvas.offsetHeight;
    }

    startAudioVisualization(stream) {
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const draw = () => {
            if (!this.isRecording) return;
            
            requestAnimationFrame(draw);
            
            this.analyser.getByteFrequencyData(dataArray);
            
            this.canvasContext.fillStyle = 'rgba(30, 41, 59, 0.5)';
            this.canvasContext.fillRect(0, 0, this.waveformCanvas.width, this.waveformCanvas.height);
            
            const barWidth = (this.waveformCanvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * this.waveformCanvas.height;
                
                const gradient = this.canvasContext.createLinearGradient(0, 0, 0, this.waveformCanvas.height);
                gradient.addColorStop(0, '#6366f1');
                gradient.addColorStop(1, '#8b5cf6');
                
                this.canvasContext.fillStyle = gradient;
                this.canvasContext.fillRect(x, this.waveformCanvas.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        };
        
        draw();
    }

    stopAudioVisualization() {
        this.canvasContext.clearRect(0, 0, this.waveformCanvas.width, this.waveformCanvas.height);
    }

    // File upload functionality
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.uploadFile(file);
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        this.uploadArea.classList.add('drag-over');
    }

    handleDragLeave() {
        this.uploadArea.classList.remove('drag-over');
    }

    handleDrop(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('drag-over');
        
        const file = event.dataTransfer.files[0];
        if (file && file.type.startsWith('audio/')) {
            this.uploadFile(file);
        } else {
            this.showToast('Please drop an audio file', 'warning');
        }
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('audio', file);
        
        this.showLoading('Uploading file...');
        
        try {
            const response = await fetch('/api/upload_audio', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            if (data.file) {
                this.setCurrentAudio(data.file, data.filename);
                this.showToast('File uploaded successfully', 'success');
            }
        } catch (error) {
            this.showToast('Failed to upload file', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Current audio management
    setCurrentAudio(file, filename) {
        this.currentAudioFile = file;
        this.currentFileName.textContent = filename;
        this.currentAudioPlayer.src = `/api/download/${filename}`;
        this.currentAudioPanel.style.display = 'block';
        this.applyEffectBtn.disabled = false;
    }

    // Transcription
    async transcribeAudio() {
        if (!this.currentAudioFile) return;
        
        this.showLoading('Transcribing audio...');
        this.transcribeBtn.disabled = true;
        
        try {
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio_file: this.currentAudioFile })
            });
            
            const data = await response.json();
            if (data.text) {
                this.transcriptionResult.textContent = data.text;
                this.transcriptionResult.classList.add('show');
                this.ttsText.value = data.text;
                this.showToast('Transcription complete', 'success');
            }
        } catch (error) {
            this.showToast('Transcription failed', 'error');
        } finally {
            this.hideLoading();
            this.transcribeBtn.disabled = false;
        }
    }

    // Tab switching
    switchTab(tab) {
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        if (tab === 'tts') {
            this.ttsTab.style.display = 'block';
            this.effectsTab.style.display = 'none';
        } else {
            this.ttsTab.style.display = 'none';
            this.effectsTab.style.display = 'block';
        }
    }

    // Voice loading
    async loadVoices() {
        try {
            const response = await fetch('/api/get_voices');
            const data = await response.json();
            
            this.voiceGrid.innerHTML = '';
            
            Object.entries(data.voices).forEach(([voice, description]) => {
                const voiceCard = document.createElement('div');
                voiceCard.className = 'voice-card';
                voiceCard.dataset.voice = voice;
                
                if (voice === this.selectedVoice) {
                    voiceCard.classList.add('selected');
                }
                
                voiceCard.innerHTML = `
                    <h4>${voice.charAt(0).toUpperCase() + voice.slice(1)}</h4>
                    <p>${description}</p>
                `;
                
                voiceCard.addEventListener('click', () => {
                    document.querySelectorAll('.voice-card').forEach(card => {
                        card.classList.remove('selected');
                    });
                    voiceCard.classList.add('selected');
                    this.selectedVoice = voice;
                });
                
                this.voiceGrid.appendChild(voiceCard);
            });
        } catch (error) {
            console.error('Failed to load voices:', error);
        }
    }

    // Effects loading
    async loadEffects() {
        try {
            const response = await fetch('/api/get_effects');
            const data = await response.json();
            
            this.effectsGrid.innerHTML = '';
            
            const effectIcons = {
                pitch_shift: 'fa-music',
                robot: 'fa-robot',
                echo: 'fa-water',
                reverse: 'fa-backward',
                speed: 'fa-tachometer-alt',
                whisper: 'fa-volume-down',
                deep: 'fa-microphone-alt',
                alien: 'fa-user-astronaut'
            };
            
            Object.entries(data.effects).forEach(([effect, config]) => {
                const effectCard = document.createElement('div');
                effectCard.className = 'effect-card';
                effectCard.dataset.effect = effect;
                effectCard.dataset.params = JSON.stringify(config.params);
                
                effectCard.innerHTML = `
                    <i class="fas ${effectIcons[effect] || 'fa-magic'}"></i>
                    <p>${config.name}</p>
                `;
                
                effectCard.addEventListener('click', () => {
                    document.querySelectorAll('.effect-card').forEach(card => {
                        card.classList.remove('selected');
                    });
                    effectCard.classList.add('selected');
                    this.selectedEffect = effect;
                    this.showEffectParams(effect, config.params);
                });
                
                this.effectsGrid.appendChild(effectCard);
            });
        } catch (error) {
            console.error('Failed to load effects:', error);
        }
    }

    // Effect parameters
    showEffectParams(effect, params) {
        this.effectParams.innerHTML = '';
        
        if (Object.keys(params).length === 0) {
            this.effectParams.classList.remove('show');
            return;
        }
        
        this.effectParams.classList.add('show');
        
        Object.entries(params).forEach(([param, config]) => {
            const paramGroup = document.createElement('div');
            paramGroup.className = 'param-group';
            
            const label = document.createElement('label');
            label.textContent = param.charAt(0).toUpperCase() + param.slice(1).replace('_', ' ');
            label.htmlFor = `param_${param}`;
            
            if (config.min !== undefined && config.max !== undefined) {
                const sliderContainer = document.createElement('div');
                sliderContainer.className = 'slider-container';
                
                const slider = document.createElement('input');
                slider.type = 'range';
                slider.id = `param_${param}`;
                slider.min = config.min;
                slider.max = config.max;
                slider.step = (config.max - config.min) / 100;
                slider.value = config.default || config.min;
                
                const value = document.createElement('span');
                value.textContent = slider.value;
                
                slider.addEventListener('input', () => {
                    value.textContent = slider.value;
                });
                
                sliderContainer.appendChild(slider);
                sliderContainer.appendChild(value);
                
                paramGroup.appendChild(label);
                paramGroup.appendChild(sliderContainer);
            }
            
            this.effectParams.appendChild(paramGroup);
        });
    }

    // TTS generation
    async generateTTS() {
        const text = this.ttsText.value.trim();
        if (!text) {
            this.showToast('Please enter some text', 'warning');
            return;
        }
        
        this.showLoading('Generating speech...');
        this.generateTtsBtn.disabled = true;
        
        try {
            const response = await fetch('/api/transform_tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    voice: this.selectedVoice,
                    speed: parseFloat(this.speedSlider.value)
                })
            });
            
            const data = await response.json();
            if (data.file) {
                this.addResult({
                    file: data.file,
                    filename: data.filename,
                    type: 'TTS',
                    details: `Voice: ${this.selectedVoice}, Speed: ${this.speedSlider.value}x`
                });
                this.showToast('Speech generated successfully', 'success');
            }
        } catch (error) {
            this.showToast('Failed to generate speech', 'error');
        } finally {
            this.hideLoading();
            this.generateTtsBtn.disabled = false;
        }
    }

    // Apply effect
    async applyEffect() {
        if (!this.currentAudioFile || !this.selectedEffect) {
            this.showToast('Please select an audio file and effect', 'warning');
            return;
        }
        
        const params = {};
        this.effectParams.querySelectorAll('input').forEach(input => {
            const paramName = input.id.replace('param_', '');
            params[paramName] = parseFloat(input.value);
        });
        
        this.showLoading('Applying effect...');
        this.applyEffectBtn.disabled = true;
        
        try {
            const response = await fetch('/api/apply_effect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input_file: this.currentAudioFile,
                    effect: this.selectedEffect,
                    params: params
                })
            });
            
            const data = await response.json();
            if (data.file) {
                this.addResult({
                    file: data.file,
                    filename: data.filename,
                    type: 'Effect',
                    details: `Effect: ${data.effect}`
                });
                this.showToast('Effect applied successfully', 'success');
            }
        } catch (error) {
            this.showToast('Failed to apply effect', 'error');
        } finally {
            this.hideLoading();
            this.applyEffectBtn.disabled = false;
        }
    }

    // Results management
    addResult(result) {
        this.resultsPanel.style.display = 'block';
        
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        resultItem.innerHTML = `
            <div class="result-info">
                <h4>${result.type}: ${result.filename}</h4>
                <p>${result.details}</p>
            </div>
            <audio controls src="/api/download/${result.filename}"></audio>
            <div class="result-actions">
                <a href="/api/download/${result.filename}" download class="btn btn-secondary">
                    <i class="fas fa-download"></i> Download
                </a>
            </div>
        `;
        
        this.resultsList.insertBefore(resultItem, this.resultsList.firstChild);
    }

    // UI utilities
    showLoading(text = 'Processing...') {
        this.loadingText.textContent = text;
        this.loadingOverlay.classList.add('show');
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('show');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <span>${message}</span>
        `;
        
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VoiceChangerApp();
});