window.onload = function () {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";

    let button = document.getElementById('guess');
    button.addEventListener('click', function () {
        recognition.start();
    })

    let transcripts = {
        'zero': 0,
        'one': 1,
        'two': 2,
        'three': 3,
        'four': 4,
        'five': 5,
        'six': 6,
        'seven': 7,
        'eight': 8,
        'nine': 9,
    }

    let number = parseInt(Math.random() * 100)
    console.log(number);

    recognition.onresult = function (event) {
        console.log(event);
        let rawTranscription = event.results[0][0].transcript.toLowerCase();

        let guess = parseInt(rawTranscription);

        if (isNaN(guess)) {
            if (transcripts.hasOwnProperty(rawTranscription))
                guess = transcripts[rawTranscription];
            else {
                let utterance = new SpeechSynthesisUtterance();
                utterance.lang = 'en-US';
                utterance.text = "Your input is invalid"

                synth.speak(utterance);

                return;
            }
        }

        if (guess == number) {
            //i won
            let utterance = new SpeechSynthesisUtterance();
            utterance.lang = 'en-US';
            utterance.text = "You won, congrats!"

            synth.speak(utterance);
        }
        else {
            if (guess < number) {
                //number too low
                let utterance = new SpeechSynthesisUtterance();
                utterance.lang = 'en-US';
                utterance.text = "The number is too low, try again!"

                synth.speak(utterance);
            }
            else {
                //number too high
                let utterance = new SpeechSynthesisUtterance();
                utterance.lang = 'en-US';
                utterance.text = "The number is too high, try again!"

                synth.speak(utterance);
            }
        }
    }

    let synth = window.speechSynthesis;
    synth.onvoiceschanged = function () {
        let voices = synth.getVoices();
        console.log(voices);

        let utterance = new SpeechSynthesisUtterance();
        utterance.lang = 'en-US';
        utterance.text = "Voices loaded, I am ready!"

        synth.speak(utterance);
    }
}
