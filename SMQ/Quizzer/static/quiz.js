// --- static/quiz.js ---
// Fully updated quiz.js with stable option IDs, robust highlighting/review,
// defensive checks, and helpful debug logging.
//
// Notes:
// - True/False inputs render with values "true"/"false" and getUserAnswer returns boolean.
// - MCQ options use option.id when available, otherwise fallback to index string.
// - highlightAnswers normalizes evaluation.correct_answer to strings when comparing.

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const quizSetup = document.getElementById('quiz-setup');
    const setupForm = document.getElementById('setup-form');
    const quizLoading = document.getElementById('quiz-loading');
    const quizContainer = document.getElementById('quiz-container');
    const quizResults = document.getElementById('quiz-results');

    // Quiz Container Elements
    const quizHeader = document.getElementById('quiz-header');
    const questionProgress = document.getElementById('question-progress');
    const currentScore = document.getElementById('current-score');
    const questionTimer = document.getElementById('question-timer');
    const questionText = document.getElementById('question-text');
    const answerOptions = document.getElementById('answer-options');
    const quizFooter = document.getElementById('quiz-footer');
    const submitAnswerBtn = document.getElementById('submit-answer');
    const nextQuestionBtn = document.getElementById('next-question');
    const questionTypeDisplay = document.getElementById('question-type-display');
    const mcqMultipleHint = document.getElementById('mcq-multiple-hint');

    // Feedback Container Elements
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackIcon = document.getElementById('feedback-icon');
    const feedbackText = document.getElementById('feedback-text');
    const feedbackExplanation = document.getElementById('feedback-explanation');
    const feedbackHint = document.getElementById('feedback-hint');
    const feedbackHeader = document.getElementById('feedback-header');

    // Question Feedback Form
    const questionFeedbackForm = document.getElementById('question-feedback-form');
    const feedbackComment = document.getElementById('feedback-comment');
    const feedbackFlag = document.getElementById('feedback-flag');
    const feedbackAlert = document.getElementById('feedback-alert');

    // Results Screen Elements
    const finalScore = document.getElementById('final-score');
    const aiFeedbackContainer = document.getElementById('ai-feedback-container');
    const resultsReviewArea = document.getElementById('results-review-area');
    const retryQuizBtn = document.getElementById('retry-quiz');
    const newQuizBtn = document.getElementById('new-quiz');

    // Flash Notification Element
    const flashNotification = document.getElementById('flash-notification');

    // --- Quiz State ---
    let quizData = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let performanceHistory = [];
    let currentDifficulty = 'medium';
    let answeredQuestions = [];
    let quizStartTime = null;
    let questionStartTime = null;
    let questionTimerInterval = null;
    let flashTimeout = null;
    let totalQuizTime = 0;
    let questionTimes = [];

    // --- Initial Setup ---
    if (quizSetup) {
        quizSetup.style.display = 'block';
        setupForm?.addEventListener('submit', startQuiz);
    } else {
        console.error("Quiz setup form not found!");
    }

    submitAnswerBtn?.addEventListener('click', handleSubmitAnswer);
    nextQuestionBtn?.addEventListener('click', loadNextQuestion);
    questionFeedbackForm?.addEventListener('submit', submitQuestionFeedback);
    retryQuizBtn?.addEventListener('click', () => window.location.reload());
    newQuizBtn?.addEventListener('click', () => window.location.href = '/');

    // --- 1. Start Quiz ---
    async function startQuiz(e) {
        e.preventDefault();
        if (!quizSetup || !quizLoading) return;

        quizSetup.style.display = 'none';
        quizLoading.style.display = 'block';

        const topicInput = document.getElementById('topic');
        const numQuestionsInput = document.getElementById('num_questions');
        const materialIdInput = document.getElementById('material_id');

        const topic = topicInput?.value || 'General Knowledge';
        const num_questions = numQuestionsInput?.value || '10';
        const material_id = materialIdInput?.value || '';

        try {
            const response = await fetch('/api/generate-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: topic,
                    num_questions: parseInt(num_questions, 10),
                    material_id: material_id ? parseInt(material_id, 10) : null
                })
            });

            quizLoading.style.display = 'none';

            if (!response.ok) {
                // Attempt to read JSON, fallback to text
                let errText = `HTTP status: ${response.status}`;
                try {
                    const errJson = await response.json();
                    errText = errJson.message || JSON.stringify(errJson);
                } catch (e) {
                    try { errText = await response.text(); } catch(e2) {}
                }
                throw new Error(errText);
            }

            const data = await response.json();
            if (!data.success || !Array.isArray(data.quiz) || data.quiz.length === 0) {
                throw new Error(data.message || 'Received invalid quiz data from server.');
            }

            quizData = data.quiz;

            // Use server-provided difficulty if available (fix bug)
            currentDifficulty = data.difficulty || 'medium';
            console.log("Quiz starting with difficulty:", currentDifficulty);

            // Reset state
            currentQuestionIndex = 0;
            score = 0;
            performanceHistory = [];
            answeredQuestions = [];
            quizStartTime = new Date();
            questionTimes = [];

            if (quizContainer) quizContainer.style.display = 'block';
            loadQuestion(currentQuestionIndex);

        } catch (error) {
            console.error('Error starting quiz:', error);
            if (quizSetup) quizSetup.style.display = 'block';
            showFlashMessage(`Error generating quiz: ${error.message}`, 'danger', 6000);
        }
    }

    // --- 2. Load Question ---
    function loadQuestion(index) {
        // stop any running timer before changing question
        stopQuestionTimer();

        if (!quizData || index >= quizData.length) {
            showResults(); return;
        }

        // Reset UI
        if (feedbackContainer) { feedbackContainer.style.display = 'none'; feedbackContainer.className = 'card'; }
        questionFeedbackForm?.reset();
        if (feedbackAlert) feedbackAlert.style.display = 'none';
        if (submitAnswerBtn) { submitAnswerBtn.style.display = 'inline-block'; submitAnswerBtn.disabled = false; }
        if (nextQuestionBtn) nextQuestionBtn.style.display = 'none';
        if (mcqMultipleHint) mcqMultipleHint.style.display = 'none';

        const question = quizData[index];
        if (!question || !questionText || !questionProgress || !currentScore || !questionTypeDisplay) {
            console.error("Missing critical elements for loadQuestion.");
            return;
        }

        questionText.textContent = question.question || '[Missing Question]';
        questionProgress.textContent = `Question ${index + 1} of ${quizData.length}`;
        currentScore.textContent = `Score: ${score}`;

        // Display Question Type (friendly)
        let displayType = 'Unknown';
        if (question.question_type) {
            displayType = question.question_type
                .replace('mcq_single', 'MCQ (Single)')
                .replace('mcq_multiple', 'MCQ (Multiple)')
                .replace('true_false', 'True/False')
                .replace('short_answer', 'Short Answer')
                .replace('fill_in_the_blank', 'Fill Blank');
        }
        questionTypeDisplay.textContent = displayType;

        // Show hint for MCQ multiple only when multiple correct answers exist
        if (question.question_type === 'mcq_multiple' &&
            Array.isArray(question.correct_answer) &&
            question.correct_answer.length > 1 &&
            mcqMultipleHint) {
            mcqMultipleHint.style.display = 'block';
        }

        renderAnswerOptions(question);

        questionStartTime = new Date();
        startQuestionTimer();
    }

    // --- 3. Render Answer Options ---
    // Uses option.id when available, else falls back to index string.
    // IMPORTANT: True/False options will have value "true" / "false" (strings),
    // and getUserAnswer returns boolean for true_false questions.
    function renderAnswerOptions(question) {
        if (!answerOptions) return;
        answerOptions.innerHTML = '';
        const type = question.question_type;

        try {
            if (type === 'mcq_single' || type === 'true_false') {
                // For true_false, render stable 'true'/'false' values.
                if (type === 'true_false') {
                    const tf = ['True', 'False'];
                    tf.forEach((labelText, idx) => {
                        const optId = idx === 0 ? 'true' : 'false';
                        const optionEl = document.createElement('div');
                        optionEl.className = 'answer-option';
                        optionEl.setAttribute('data-option-id', optId);
                        optionEl.innerHTML = `
                            <label>
                                <input type="radio" name="answer" value="${optId}" aria-label="${labelText}">
                                <span>${labelText}</span>
                            </label>
                        `;
                        answerOptions.appendChild(optionEl);
                    });
                } else {
                    const options = question.options || [];
                    if (options.length === 0) throw new Error("MCQ options missing");
                    options.forEach((option, index) => {
                        const optId = (typeof option === 'object' && option.id !== undefined) ? String(option.id) : String(index);
                        const labelText = (typeof option === 'object' && option.label !== undefined) ? option.label : option;
                        const optionEl = document.createElement('div');
                        optionEl.className = 'answer-option';
                        optionEl.setAttribute('data-option-id', optId);
                        optionEl.innerHTML = `
                            <label>
                                <input type="radio" name="answer" value="${optId}" aria-label="${labelText}">
                                <span>${labelText || `Option ${index + 1}`}</span>
                            </label>
                        `;
                        answerOptions.appendChild(optionEl);
                    });
                }
            } else if (type === 'mcq_multiple') {
                const options = question.options || [];
                if (options.length < 2) throw new Error("MCQ Multiple needs at least 2 options");

                options.forEach((option, index) => {
                    const optId = (typeof option === 'object' && option.id !== undefined) ? String(option.id) : String(index);
                    const labelText = (typeof option === 'object' && option.label !== undefined) ? option.label : option;
                    const optionEl = document.createElement('div');
                    optionEl.className = 'answer-option';
                    optionEl.setAttribute('data-option-id', optId);
                    optionEl.innerHTML = `
                        <label>
                            <input type="checkbox" name="answer" value="${optId}" aria-label="${labelText}">
                            <span>${labelText || `Option ${index + 1}`}</span>
                        </label>
                    `;
                    answerOptions.appendChild(optionEl);
                });
            } else if (type === 'short_answer' || type === 'fill_in_the_blank') {
                const optionEl = document.createElement('div');
                optionEl.className = 'form-group';
                optionEl.innerHTML = `
                    <label for="short-answer-input">Your Answer:</label>
                    <input type="text" id="short-answer-input" class="form-control" placeholder="Type your answer..." aria-label="Short answer">
                `;
                answerOptions.appendChild(optionEl);
                document.getElementById('short-answer-input')?.focus();
            } else {
                throw new Error(`Unsupported question type: ${type}`);
            }
        } catch (error) {
            console.error("Error rendering answer options:", error, question);
            answerOptions.innerHTML = `<p class="text-danger">Error displaying options for this question.</p>`;
        }
    }

    // --- 4. Handle Answer Submission ---
    async function handleSubmitAnswer() {
        if (!submitAnswerBtn) return;
        stopQuestionTimer();
        submitAnswerBtn.disabled = true;

        const question = quizData[currentQuestionIndex];
        if (!question) return;

        const userAnswer = getUserAnswer(question.question_type);
        const timeSpent = Math.round((new Date() - (questionStartTime || new Date())) / 1000);

        // Save question time locally
        questionTimes.push(timeSpent);

        // Basic validation
        if (userAnswer === null || (Array.isArray(userAnswer) && userAnswer.length === 0) || (typeof userAnswer === 'string' && userAnswer.trim() === '')) {
            alert("Please select or type an answer.");
            submitAnswerBtn.disabled = false;
            startQuestionTimer();
            return;
        }

        // Debug log of payload
        console.log('Submitting answer payload:', {
            qid: question.id ?? question.question ?? `index-${currentQuestionIndex}`,
            sent_user_answer: userAnswer,
            question_object: question
        });

        try {
            const response = await fetch('/api/evaluate-answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question, user_answer: userAnswer })
            });

            if (!response.ok) {
                let errMsg = `HTTP status: ${response.status}`;
                try { const err = await response.json(); errMsg = err.message || JSON.stringify(err); } catch(e){ try{ errMsg = await response.text(); }catch{} }
                throw new Error(errMsg);
            }

            const data = await response.json();
            if (!data.success || !data.evaluation || !data.feedback) {
                throw new Error(data.message || 'Invalid response format from evaluation endpoint.');
            }

            const { evaluation, feedback } = data;

            if (evaluation.is_correct) score++;
            performanceHistory.push(!!evaluation.is_correct);

            // Store answered question with time_spent key for server compatibility
            answeredQuestions.push({ question, userAnswer, evaluation, feedback, time_spent: timeSpent });

            showFeedback(feedback, evaluation);
            highlightAnswers(question, evaluation);

            if (currentScore) currentScore.textContent = `Score: ${score}`;
            if (submitAnswerBtn) submitAnswerBtn.style.display = 'none';
            if (nextQuestionBtn) nextQuestionBtn.style.display = 'inline-block';

            // Update difficulty in background
            updateAdaptiveDifficulty();

        } catch (error) {
            console.error('Error submitting answer:', error);
            showFlashMessage(`Error submitting answer: ${error.message}`, 'danger', 6000);
            submitAnswerBtn.disabled = false;
        }
    }

    // --- 5. Get User's Answer from DOM ---
    function getUserAnswer(type) {
        if (type === 'mcq_single') {
            const selected = document.querySelector('input[name="answer"]:checked');
            return selected ? String(selected.value) : null;
        }
        if (type === 'true_false') {
            const selected = document.querySelector('input[name="answer"]:checked');
            if (!selected) return null;
            // Return boolean true/false for easier evaluation & review
            return selected.value === 'true';
        }
        if (type === 'mcq_multiple') {
            const selected = document.querySelectorAll('input[name="answer"]:checked');
            return Array.from(selected).map(el => String(el.value));
        }
        if (type === 'short_answer' || type === 'fill_in_the_blank') {
            const inputEl = document.getElementById('short-answer-input');
            return inputEl ? inputEl.value.trim() : "";
        }
        return null;
    }

    // --- 6. Show Inline Feedback ---
    function showFeedback(feedback, evaluation) {
        if (!feedbackContainer || !feedbackIcon || !feedbackText || !feedbackExplanation || !feedbackHint || !feedbackHeader) return;

        feedbackContainer.style.display = 'block';
        feedbackIcon.textContent = feedback.status_icon || '';
        feedbackText.textContent = feedback.status_text || (evaluation.is_correct ? 'Correct' : 'Incorrect');
        feedbackExplanation.textContent = feedback.explanation || 'No explanation available.';

        if (feedback.hint) {
            feedbackHint.textContent = feedback.hint;
            feedbackHint.style.display = 'block';
        } else {
            feedbackHint.style.display = 'none';
        }

        const correctnessClass = evaluation.is_correct ? 'correct' : 'incorrect';
        feedbackContainer.className = `card ${correctnessClass}`;
        feedbackHeader.className = correctnessClass;
    }

    // --- 7. Highlight Correct/Incorrect Options ---
    function highlightAnswers(question, evaluation) {
        if (!answerOptions) return;
        const type = question.question_type;
        const optionsUI = answerOptions.querySelectorAll('.answer-option, .form-group');

        // Disable inputs
        answerOptions.querySelectorAll('input').forEach(input => input.disabled = true);
        answerOptions.classList.add('submitted');

        try {
            // Normalize expected answers into a set of strings
            let expectedSet = new Set();
            if (Array.isArray(evaluation.correct_answer)) {
                (evaluation.correct_answer || []).forEach(v => expectedSet.add(String(v)));
            } else if (evaluation.correct_answer !== undefined && evaluation.correct_answer !== null) {
                // Special-case boolean correct answers from backend for true_false
                if (typeof evaluation.correct_answer === 'boolean') {
                    expectedSet.add(String(evaluation.correct_answer)); // 'true' or 'false'
                } else {
                    expectedSet.add(String(evaluation.correct_answer));
                }
            }

            if (type === 'mcq_single' || type === 'true_false' || type === 'mcq_multiple') {
                optionsUI.forEach(optionEl => {
                    const input = optionEl.querySelector('input');
                    const optId = optionEl.getAttribute('data-option-id') || (input ? String(input.value) : null);
                    if (!input) return;
                    optionEl.classList.add('submitted');

                    // if optId is in expected set -> correct
                    if (optId && expectedSet.has(optId)) {
                        optionEl.classList.add('correct');
                    } else if (input.checked) {
                        // user selected but not in expected -> incorrect
                        optionEl.classList.add('incorrect', 'user-selected');
                    }
                });
            } else if (type === 'short_answer' || type === 'fill_in_the_blank') {
                const inputEl = document.getElementById('short-answer-input');
                if (inputEl) {
                    inputEl.disabled = true;
                    inputEl.classList.add(evaluation.is_correct ? 'correct-input' : 'incorrect-input');
                    optionsUI.forEach(el => el.classList.add('submitted'));
                }
            }
        } catch (error) {
            console.error("Error highlighting answers:", error, question, evaluation);
        }
    }

    // --- 8. Load Next Question ---
    function loadNextQuestion() {
        // Record time_spent for question if start time exists
        if (questionStartTime) {
            const elapsed = Math.round((new Date() - questionStartTime) / 1000);
            questionTimes.push(elapsed);
        }

        currentQuestionIndex++;
        if (answerOptions) {
            answerOptions.classList.remove('submitted');
            // remove option state classes to avoid carryover visual effects
            answerOptions.querySelectorAll('.answer-option').forEach(el => {
                el.classList.remove('correct', 'incorrect', 'user-selected', 'submitted');
                // Also re-enable inputs just in case (they will be recreated by render)
                const input = el.querySelector('input');
                if (input) input.disabled = false;
            });
        }
        loadQuestion(currentQuestionIndex);
    }

    // --- 9. Show Final Results ---
    function showResults() {
        stopQuestionTimer();
        if (quizContainer) quizContainer.style.display = 'none';
        if (quizResults) quizResults.style.display = 'block';

        const total = quizData.length;
        const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

        if (quizStartTime) {
            const endTime = new Date();
            totalQuizTime = Math.floor((endTime - quizStartTime) / 1000);
        }

        updateResultsDisplay(score, total, percentage);

        // Non-blocking saves/feedback; errors handled internally
        saveQuizAttempt();
        fetchAIFeedback();
        renderResultsReview();
    }

    // --- 9a. Update Results Display ---
    function updateResultsDisplay(correctScore, totalQuestions, percentage) {
        const scorePercentage = document.getElementById('score-percentage');
        const scoreFraction = document.getElementById('score-fraction');
        const correctCount = document.getElementById('correct-count');
        const totalCount = document.getElementById('total-count');
        const gradeDisplay = document.getElementById('grade-display');
        const accuracyScore = document.getElementById('accuracy-score');
        const totalTime = document.getElementById('total-time');
        const avgTimePerQuestion = document.getElementById('avg-time-per-question');
        const completionTimestamp = document.getElementById('completion-timestamp');
        const quizDifficulty = document.getElementById('quiz-difficulty');
        const completionEmoji = document.getElementById('completion-emoji');
        const performanceMessage = document.getElementById('performance-message');

        if (scorePercentage) scorePercentage.textContent = `${percentage}%`;
        if (scoreFraction) scoreFraction.textContent = `${correctScore} / ${totalQuestions}`;
        if (correctCount) correctCount.textContent = correctScore;
        if (totalCount) totalCount.textContent = totalQuestions;
        if (accuracyScore) accuracyScore.textContent = `${percentage}%`;

        if (totalTime) {
            const minutes = Math.floor(totalQuizTime / 60);
            const seconds = totalQuizTime % 60;
            totalTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        if (avgTimePerQuestion) {
            const avgTime = totalQuestions > 0 ? Math.round(totalQuizTime / totalQuestions) : 0;
            avgTimePerQuestion.textContent = `${avgTime}s`;
        }

        if (completionTimestamp) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            completionTimestamp.textContent = `Today, ${timeString}`;
        }

        if (quizDifficulty) {
            quizDifficulty.textContent = currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1);
        }

        const grade = getGradeFromPercentage(percentage);
        if (gradeDisplay) {
            gradeDisplay.textContent = grade;
            gradeDisplay.className = `score-value grade grade-${grade.replace('+','plus')}`;
        }

        if (completionEmoji) {
            if (percentage >= 90) completionEmoji.textContent = '🏆';
            else if (percentage >= 80) completionEmoji.textContent = '🎉';
            else if (percentage >= 70) completionEmoji.textContent = '👏';
            else if (percentage >= 60) completionEmoji.textContent = '👍';
            else if (percentage >= 50) completionEmoji.textContent = '📚';
            else completionEmoji.textContent = '💪';
        }

        if (performanceMessage) {
            const message = getPerformanceMessage(percentage);
            performanceMessage.innerHTML = `<p>${message}</p>`;
        }

        updateScoreCircle(percentage);
    }

    // --- 9b. Get Grade from Percentage ---
    function getGradeFromPercentage(percentage) {
        if (percentage >= 90) return 'A+';
        else if (percentage >= 80) return 'A';
        else if (percentage >= 70) return 'B';
        else if (percentage >= 60) return 'C';
        else if (percentage >= 50) return 'D';
        else return 'F';
    }

    // --- 9c. Get Performance Message ---
    function getPerformanceMessage(percentage) {
        if (percentage >= 90) {
            return "Outstanding work! You've mastered this topic! 🌟";
        } else if (percentage >= 80) {
            return "Excellent performance! You're doing great! 🎯";
        } else if (percentage >= 70) {
            return "Good job! You're on the right track! 📈";
        } else if (percentage >= 60) {
            return "Not bad! Keep practicing to improve further! 💪";
        } else if (percentage >= 50) {
            return "You're making progress! Review the material and try again! 📚";
        } else {
            return "Don't give up! Every attempt helps you learn. Keep studying! 🌱";
        }
    }

    // --- 9d. Update Score Circle Animation ---
    function updateScoreCircle(percentage) {
        const scoreCircle = document.querySelector('.score-circle');
        if (!scoreCircle) return;

        const angle = (percentage / 100) * 360;

        let color = '#5b86e5';
        if (percentage >= 90) color = '#28a745';
        else if (percentage >= 70) color = '#17a2b8';
        else if (percentage >= 50) color = '#ffc107';
        else color = '#dc3545';

        scoreCircle.style.background = `conic-gradient(${color} ${angle}deg, #e9ecef ${angle}deg)`;
        scoreCircle.style.transition = 'background 1s ease-in-out';
    }

    // --- 10. Save Quiz Attempt ---
    async function saveQuizAttempt() {
        let topic = 'General Knowledge';
        const materialTopicEl = document.getElementById('material_topic');
        const topicEl = document.getElementById('topic');

        if (materialTopicEl && materialTopicEl.value && materialTopicEl.value.trim() !== '') {
            topic = materialTopicEl.value;
        } else if (topicEl && topicEl.value) {
            topic = topicEl.value;
        }

        const answersPayload = answeredQuestions.map(aq => ({
            question: aq.question,
            userAnswer: aq.userAnswer,
            evaluation: aq.evaluation,
            feedback: aq.feedback,
            time_spent: Math.round(aq.time_spent || 0)
        }));

        try {
            console.log('Saving quiz attempt with data:', {
                topic: topic,
                score: score,
                total_questions: quizData.length,
                answers_count: answersPayload.length
            });

            const response = await fetch('/api/save-attempt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: topic, score: score, total_questions: quizData.length,
                    answers: answersPayload
                })
            });
            if (!response.ok) {
                let err = `HTTP status: ${response.status}`;
                try { const j = await response.json(); err = j.message || JSON.stringify(j); } catch(e) { try { err = await response.text(); } catch{} }
                throw new Error(err);
            }
            console.log('Quiz attempt saved successfully with topic:', topic);
        } catch (error) {
            console.error('Error saving quiz attempt:', error);
            // Non-critical: inform user briefly
            showFlashMessage('Could not save attempt details (offline).', 'warning', 4000);
        }
    }

    // --- 11. Fetch AI Feedback ---
    async function fetchAIFeedback() {
        if (!aiFeedbackContainer) return;
        aiFeedbackContainer.innerHTML = '<p class="loading">Generating personalized feedback...</p>';

        let topic = 'General Knowledge';
        const materialTopicEl = document.getElementById('material_topic');
        const topicEl = document.getElementById('topic');

        if (materialTopicEl && materialTopicEl.value && materialTopicEl.value.trim() !== '') {
            topic = materialTopicEl.value;
        } else if (topicEl && topicEl.value) {
            topic = topicEl.value;
        }

        const incorrect_questions = answeredQuestions
            .filter(aq => !aq.evaluation.is_correct)
            .map(aq => aq.question.question);

        try {
            const response = await fetch('/api/generate-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: topic, score: score, total_questions: quizData.length,
                    incorrect_questions: incorrect_questions
                })
            });
            if (!response.ok) {
                let err = `HTTP status: ${response.status}`;
                try { const j = await response.json(); err = j.message || JSON.stringify(j); } catch(e){ try { err = await response.text(); } catch{} }
                throw new Error(err);
            }

            const data = await response.json();
            if (data.success && data.feedback) {
                const fb = data.feedback;
                aiFeedbackContainer.innerHTML = `
                    <h3>Personalized Feedback</h3>
                    <p><strong>${fb.encouragement || ''}</strong></p>
                    <p><strong>Areas to Review:</strong> ${fb.weak_areas || 'N/A'}</p>
                    <p><strong>Study Tip:</strong> ${fb.study_tips || 'N/A'}</p>
                    <p><em>${fb.motivation || ''}</em></p>
                `;
            } else {
                throw new Error(data.message || 'Invalid feedback response from server.');
            }
        } catch (error) {
            console.error('Error fetching AI feedback:', error);
            aiFeedbackContainer.innerHTML = `<p class="text-danger">Error loading AI feedback: ${error.message}</p>`;
        }
    }

    // --- 12. Render Results Review ---
    function renderResultsReview() {
        if (!resultsReviewArea) return;
        resultsReviewArea.innerHTML = '<h3>Review Your Answers</h3>';

        if (!answeredQuestions || answeredQuestions.length === 0) {
            resultsReviewArea.innerHTML += '<p>No answers recorded for review.</p>';
            return;
        }

        answeredQuestions.forEach((aq, index) => {
            const item = document.createElement('div');
            item.className = 'review-item';

            let answerSummary = '<p>Error displaying answer details.</p>';
            try {
                const type = aq.question?.question_type;
                const ua = aq.userAnswer;
                const ca = aq.evaluation?.correct_answer;
                const optsRaw = aq.question?.options || [];

                const idToLabel = {};
                // map indices and ids to labels
                optsRaw.forEach((opt, i) => {
                    if (typeof opt === 'object') {
                        if (opt.id !== undefined) idToLabel[String(opt.id)] = opt.label ?? String(opt.id);
                        idToLabel[String(i)] = opt.label ?? `Option ${i+1}`;
                    } else {
                        idToLabel[String(i)] = String(opt);
                    }
                });

                const isCorrect = !!aq.evaluation?.is_correct;

                if (type === 'mcq_single') {
                    const userAnswerText = (ua !== null && ua !== undefined) ? (idToLabel[String(ua)] || String(ua)) : 'No answer';
                    const correctAnswerText = (ca !== null && ca !== undefined) ? (idToLabel[String(ca)] || String(ca)) : 'N/A';
                    answerSummary = `
                        <div class="review-answer ${isCorrect ? 'correct' : 'incorrect'}">Your answer: <span>${userAnswerText}</span></div>
                        ${!isCorrect ? `<div class="review-answer correct">Correct answer: <span>${correctAnswerText}</span></div>` : ''}
                    `;
                } else if (type === 'true_false') {
                    const userAnswerText = ua === true ? 'True' : ua === false ? 'False' : 'No answer';
                    const correctAnswerText = ca === true ? 'True' : ca === false ? 'False' : 'N/A';
                    answerSummary = `
                        <div class="review-answer ${isCorrect ? 'correct' : 'incorrect'}">Your answer: <span>${userAnswerText}</span></div>
                        ${!isCorrect ? `<div class="review-answer correct">Correct answer: <span>${correctAnswerText}</span></div>` : ''}
                    `;
                } else if (type === 'mcq_multiple') {
                    const userAnswersText = (Array.isArray(ua) && ua.length > 0)
                        ? ua.map(x => idToLabel[String(x)] || String(x)).join(', ')
                        : 'No answer';
                    const correctAnswersText = (Array.isArray(ca) && ca.length > 0)
                        ? ca.map(x => idToLabel[String(x)] || String(x)).join(', ')
                        : 'N/A';
                    answerSummary = `
                        <div class="review-answer ${isCorrect ? 'correct' : 'incorrect'}">Your answer: <span>${userAnswersText}</span></div>
                        <div class="review-answer correct">Correct answer(s): <span>${correctAnswersText}</span></div>
                    `;
                } else if (type === 'short_answer' || type === 'fill_in_the_blank') {
                    answerSummary = `
                        <div class="review-answer ${isCorrect ? 'correct' : 'incorrect'}">Your answer: <span>${ua || 'No answer'}</span></div>
                        ${!isCorrect ? `<div class="review-answer correct">Correct answer: <span>${ca || 'N/A'}</span></div>` : ''}
                    `;
                } else {
                    answerSummary = `<p>Unsupported question type for review: ${type}</p>`;
                }
            } catch (renderErr) {
                console.error("Error rendering review summary:", renderErr, aq);
            }

            const questionTextContent = aq.question?.question || '[Question Text Missing]';
            const explanationText = aq.feedback?.explanation || 'No explanation available.';

            item.innerHTML = `
                <p><strong>Q${index + 1}: ${questionTextContent}</strong></p>
                ${answerSummary}
                <p style="font-size: 0.9rem; margin-top: 0.75rem;"><em>Explanation: ${explanationText}</em></p>
            `;
            resultsReviewArea.appendChild(item);
        });
    }

    // *** Flash Message Function ***
    function showFlashMessage(message, type = 'info', duration = 4000) {
        if (!flashNotification) { console.warn("Flash notification element not found."); alert(message); return; }

        clearTimeout(flashTimeout);

        flashNotification.textContent = message;
        flashNotification.className = `flash-notification ${type}`;

        // Force reflow
        void flashNotification.offsetWidth;

        flashNotification.classList.add('show');

        flashTimeout = setTimeout(() => {
            flashNotification.classList.remove('show');
            flashTimeout = null;
        }, duration);
    }

    // --- 13. Update Adaptive Difficulty ---
    async function updateAdaptiveDifficulty() {
        try {
            const response = await fetch('/api/update-difficulty', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ performance_history: performanceHistory, current_difficulty: currentDifficulty })
            });
            if (!response.ok) {
                console.warn(`Failed to update difficulty: ${response.status}`);
                return;
            }

            const data = await response.json();
            if (data.success && data.difficulty_changed) {
                const oldDifficulty = currentDifficulty;
                currentDifficulty = data.recommended_difficulty;
                console.log(`Adaptive difficulty updated: ${oldDifficulty} -> ${currentDifficulty}`);
                showFlashMessage(`Difficulty adjusted: ${oldDifficulty.toUpperCase()} → ${currentDifficulty.toUpperCase()}`, 'info', 3500);
            } else if (data.success) {
                console.log(`Difficulty remains: ${currentDifficulty}`);
            } else {
                console.warn(`Update difficulty API call failed: ${data.message}`);
            }
        } catch (error) {
            console.error('Error in updateAdaptiveDifficulty fetch:', error);
        }
    }

    // --- 14. Submit Question Feedback ---
    async function submitQuestionFeedback(e) {
        e.preventDefault();
        if (!feedbackComment || !feedbackFlag || !feedbackAlert || !questionFeedbackForm) return;

        const question = quizData[currentQuestionIndex];
        const feedback_text = feedbackComment.value;
        const is_flagged = feedbackFlag.checked;

        if (!feedback_text.trim()) {
            feedbackAlert.textContent = 'Please enter feedback.';
            feedbackAlert.className = 'flash danger';
            feedbackAlert.style.display = 'block';
            return;
        }

        try {
            const response = await fetch('/api/submit-feedback', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question_text: question?.question || '[N/A]', feedback_text, is_flagged })
            });
            if (!response.ok) {
                let err = `HTTP status: ${response.status}`;
                try { const j = await response.json(); err = j.message || JSON.stringify(j); } catch(e){ try{ err = await response.text(); }catch{} }
                throw new Error(err);
            }

            const data = await response.json();
            feedbackAlert.textContent = data.message || 'Feedback sent.';
            feedbackAlert.className = 'flash success';
            feedbackAlert.style.display = 'block';
            questionFeedbackForm.reset();

            setTimeout(() => { if(feedbackAlert) feedbackAlert.style.display = 'none'; }, 5000);
        } catch (error) {
            console.error('Submit feedback error:', error);
            feedbackAlert.textContent = `Error: ${error.message}`;
            feedbackAlert.className = 'flash danger';
            feedbackAlert.style.display = 'block';
        }
    }

    // --- 15. Question Timer ---
    function startQuestionTimer() {
        stopQuestionTimer();
        let seconds = 0;
        if (questionTimer) questionTimer.textContent = 'Time: 0s';

        questionTimerInterval = setInterval(() => {
            seconds++;
            if (questionTimer) questionTimer.textContent = `Time: ${seconds}s`;
        }, 1000);
    }
    function stopQuestionTimer() {
        if (questionTimerInterval) {
            clearInterval(questionTimerInterval);
            questionTimerInterval = null;
        }
    }

}); // End DOMContentLoaded
