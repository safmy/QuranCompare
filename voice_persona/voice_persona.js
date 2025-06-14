// Voice Persona Changer - Frontend JavaScript
class VoicePersonaChanger {
    constructor() {
        this.isActive = false;
        this.statusInterval = null;
        this.currentPersona = 'british_woman';
        
        // Persona flags mapping
        this.personaFlags = {
            'british_woman': '🇬🇧',
            'indian_man': '🇮🇳',
            'american_woman': '🇺🇸',
            'australian_man': '🇦🇺',
            'french_woman': '🇫🇷',
            'scottish_man': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
            'japanese_woman': '🇯🇵',
            'german_man': '🇩🇪',
            'spanish_woman': '🇪🇸',
            'russian_man': '🇷🇺'
        };
        
        // Sample texts for different personas
        this.sampleTexts = {
            'british_woman': "Good afternoon! Lovely weather we're having today, isn't it? Would you care for a spot of tea?",
            'indian_man': "Namaste! Welcome to our wonderful world of voice transformation. How may I assist you today?",
            'american_woman': "Hey there! This voice changer is totally awesome. You're gonna love how it works!",
            'australian_man': "G'day mate! How's it going? This voice tech is absolutely bonzer, no worries!",
            'french_woman': "Bonjour! Comment allez-vous? This technology is magnifique, n'est-ce pas?",
            'scottish_man': "Och, hello there! This wee bit of technology is pure dead brilliant, so it is!",
            'japanese_woman': "Konnichiwa! This voice transformation technology is truly sugoi desu ne!",
            'german_man': "Guten Tag! This voice changing technology is sehr gut engineered, ja?",
            'spanish_woman': "¡Hola! ¿Cómo estás? This voice technology is absolutamente fantástico!",
            'russian_man': "Zdravstvuyte! This voice transformation technology is very impressive, da?"
        };
        
        this.init();
    }
    
    init() {
        // Load initial status
        this.updateStatus();
        this.loadPersonas();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Check for microphone permissions
        this.checkMicrophonePermissions();
    }
    
    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                this.toggleVoiceChanger();
            }
        });
        
        // Visual feedback for speaking
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            this.setupVoiceActivityDetection();
        }
    }
    
    async checkMicrophonePermissions() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            console.log('Microphone access granted');
        } catch (err) {
            console.error('Microphone access denied:', err);
            this.showToast('Please allow microphone access to use voice transformation', 'error');
        }
    }
    
    setupVoiceActivityDetection() {
        // Optional: Add visual feedback when speaking
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                const audioContext = new AudioContext();
                const microphone = audioContext.createMediaStreamSource(stream);
                const analyser = audioContext.createAnalyser();
                
                microphone.connect(analyser);
                analyser.fftSize = 256;
                
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                
                const checkAudio = () => {
                    analyser.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b) / bufferLength;
                    
                    // Add visual feedback based on audio level
                    if (this.isActive && average > 20) {
                        document.querySelector('.status-dot').style.transform = `scale(${1 + average / 200})`;
                    }
                    
                    requestAnimationFrame(checkAudio);
                };
                
                checkAudio();
            })
            .catch(err => console.error('Voice activity detection error:', err));
    }
    
    async loadPersonas() {
        try {
            const response = await fetch('/status');
            const data = await response.json();
            
            const grid = document.getElementById('personasGrid');
            grid.innerHTML = '';
            
            // Create persona cards with animation
            let delay = 0;
            for (const [key, persona] of Object.entries(data.all_personas)) {
                const card = this.createPersonaCard(key, persona);
                card.style.animationDelay = `${delay}ms`;
                grid.appendChild(card);
                delay += 50;
            }
            
            // Set active persona
            this.currentPersona = data.persona;
            this.updateActivePersona();
        } catch (err) {
            console.error('Error loading personas:', err);
            this.showToast('Error loading voice personas', 'error');
        }
    }
    
    createPersonaCard(key, persona) {
        const card = document.createElement('div');
        card.className = 'persona-card';
        card.dataset.persona = key;
        card.style.animation = 'fadeInUp 0.5s ease-out forwards';
        card.style.opacity = '0';
        
        // Add gender icon
        const genderIcon = persona.name.includes('Woman') ? '♀️' : '♂️';
        
        card.innerHTML = `
            <div class="persona-flag">${this.personaFlags[key] || '🌍'}</div>
            <div class="persona-name">${persona.name} ${genderIcon}</div>
            <div class="persona-description">${persona.description}</div>
            <div class="persona-details">
                <span class="detail-item">Speed: ${persona.speed}x</span>
                <span class="detail-item">Pitch: ${persona.pitch_shift}x</span>
            </div>
            <button class="sample-button" onclick="voiceChanger.playSample('${key}', event)">
                <span class="play-icon">▶️</span> Play Sample
            </button>
        `;
        
        card.onclick = (e) => {
            if (!e.target.classList.contains('sample-button') && !e.target.parentElement.classList.contains('sample-button')) {
                this.selectPersona(key);
            }
        };
        
        return card;
    }
    
    async selectPersona(persona) {
        try {
            const response = await fetch('/persona', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({persona: persona})
            });
            
            const data = await response.json();
            if (data.success) {
                this.currentPersona = persona;
                this.updateActivePersona();
                this.showToast(`Switched to ${this.getPersonaName(persona)} voice`);
                
                // Add haptic feedback if available
                if ('vibrate' in navigator) {
                    navigator.vibrate(50);
                }
            }
        } catch (err) {
            console.error('Error selecting persona:', err);
            this.showToast('Error changing voice persona', 'error');
        }
    }
    
    updateActivePersona() {
        document.querySelectorAll('.persona-card').forEach(card => {
            if (card.dataset.persona === this.currentPersona) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
    }
    
    getPersonaName(key) {
        const card = document.querySelector(`[data-persona="${key}"]`);
        return card ? card.querySelector('.persona-name').textContent.replace(/[♀️♂️]/g, '').trim() : key;
    }
    
    async toggleVoiceChanger() {
        try {
            if (!this.isActive) {
                const response = await fetch('/start', {method: 'POST'});
                const data = await response.json();
                
                if (data.success) {
                    this.isActive = true;
                    this.updateUI();
                    this.startStatusUpdates();
                    this.showToast('Voice transformation started! Speak into your microphone.');
                }
            } else {
                const response = await fetch('/stop', {method: 'POST'});
                const data = await response.json();
                
                this.isActive = false;
                this.updateUI();
                this.stopStatusUpdates();
                this.showToast('Voice transformation stopped');
            }
        } catch (err) {
            console.error('Error toggling voice changer:', err);
            this.showToast('Error controlling voice transformation', 'error');
        }
    }
    
    async testSpeakers() {
        try {
            const response = await fetch('/test', {method: 'POST'});
            const data = await response.json();
            this.showToast('Playing test tone... Did you hear it?');
        } catch (err) {
            console.error('Error testing speakers:', err);
            this.showToast('Error playing test tone', 'error');
        }
    }
    
    async playSample(persona, event) {
        event.stopPropagation();
        
        const button = event.target.closest('.sample-button');
        const originalContent = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<span class="loading"></span> Generating...';
        
        try {
            const response = await fetch('/sample', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    persona: persona,
                    text: this.sampleTexts[persona] || 'Hello! This is a sample of my transformed voice.'
                })
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const audio = new Audio(URL.createObjectURL(blob));
                
                audio.onended = () => {
                    button.disabled = false;
                    button.innerHTML = originalContent;
                };
                
                audio.play();
                button.innerHTML = '<span class="pause-icon">⏸️</span> Playing...';
                this.showToast(`Playing ${this.getPersonaName(persona)} voice sample`);
            } else {
                throw new Error('Failed to generate sample');
            }
        } catch (err) {
            console.error('Error playing sample:', err);
            button.disabled = false;
            button.innerHTML = originalContent;
            this.showToast('Error generating voice sample', 'error');
        }
    }
    
    updateUI() {
        const btn = document.getElementById('startBtn');
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        
        if (this.isActive) {
            btn.textContent = 'Stop Transformation';
            btn.classList.add('active');
            statusDot.classList.add('active');
            statusText.textContent = `Transforming to ${this.getPersonaName(this.currentPersona)}`;
        } else {
            btn.textContent = 'Start Transformation';
            btn.classList.remove('active');
            statusDot.classList.remove('active');
            statusText.textContent = 'Ready to transform';
        }
    }
    
    async updateStatus() {
        try {
            const response = await fetch('/status');
            const data = await response.json();
            
            // Update device info
            if (data.devices) {
                const input = data.devices.find(d => d.index === data.input_device);
                const output = data.devices.find(d => d.index === data.output_device);
                document.getElementById('deviceInfo').innerHTML = 
                    `<strong>Input:</strong> ${input?.name || 'None'} | <strong>Output:</strong> ${output?.name || 'None'}`;
            }
            
            // Update levels with smooth animation
            const inputPct = Math.min((data.input_level / 5000) * 100, 100);
            const outputPct = Math.min((data.output_level / 5000) * 100, 100);
            
            this.animateLevel('inputLevel', inputPct);
            this.animateLevel('outputLevel', outputPct);
            
            this.isActive = data.active;
            this.currentPersona = data.persona;
            this.updateUI();
            this.updateActivePersona();
        } catch (err) {
            console.error('Error updating status:', err);
        }
    }
    
    animateLevel(elementId, targetWidth) {
        const element = document.getElementById(elementId);
        const currentWidth = parseFloat(element.style.width) || 0;
        const diff = targetWidth - currentWidth;
        
        if (Math.abs(diff) > 0.5) {
            element.style.width = (currentWidth + diff * 0.3) + '%';
        }
    }
    
    startStatusUpdates() {
        this.statusInterval = setInterval(() => this.updateStatus(), 100);
    }
    
    stopStatusUpdates() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
        }
        setTimeout(() => this.updateStatus(), 500);
    }
    
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .persona-details {
        display: flex;
        gap: 15px;
        margin-top: 10px;
        font-size: 0.8em;
        opacity: 0.7;
    }
    
    .detail-item {
        background: rgba(255, 255, 255, 0.1);
        padding: 4px 8px;
        border-radius: 12px;
    }
    
    .toast.error {
        background: rgba(255, 0, 65, 0.9);
    }
    
    .pause-icon, .play-icon {
        display: inline-block;
        margin-right: 5px;
    }
`;
document.head.appendChild(style);

// Initialize the voice changer when the page loads
let voiceChanger;
window.addEventListener('DOMContentLoaded', () => {
    voiceChanger = new VoicePersonaChanger();
});