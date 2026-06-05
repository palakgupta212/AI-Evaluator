import axios from 'axios';

// Gemini 2.5 Flash API endpoint
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Helper function to retry API calls with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const statusCode = error.response?.status;
      
      // Only retry on 503 (Service Unavailable) or 429 (Rate Limit)
      if ((statusCode === 503 || statusCode === 429) && attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt); // Exponential backoff: 1s, 2s, 4s
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If not retryable or last attempt, throw the error
      throw error;
    }
  }
}

export async function extractAnswerSheet(base64Data, mimeType = 'image/jpeg') {
  const prompt = `You are reading a student's answer sheet (could be an image or PDF). Extract all questions and their answers.

CRITICAL INSTRUCTIONS FOR QUESTION NUMBER IDENTIFICATION:
- Question numbers can be in various formats: Q1, Q2, Q3, 1, 2, 3, 1(a), 1(b), 1-a, 1-b, 2(a), 2(b), 2-a, 2-b, etc.
- Also recognize: 1a, 1b, 2a, 2b, Q1a, Q1b, Q2a, Q2b
- IMPORTANT: Students may write question numbers in TOP-LEFT format where:
  * A main question number (like "1" or "Q1") appears once
  * Then sub-questions are written as "a", "b", "c" in the top-left corner of each answer section
  * These should be interpreted as "1-a", "1-b", "1-c" respectively
  * If you see a standalone "a", "b", "c" after a main question "1", map them to "1-a", "1-b", "1-c"
  * If you see a standalone "a", "b", "c" after a main question "2", map them to "2-a", "2-b", "2-c"
  * Look for context: if "a" appears after question "1" and before question "2", it's "1-a"
- Normalize all question numbers to match database format: "1", "1-a", "1-b", "2", "2-a", "2-b", etc.
- If you see "Q1(a)" or "Q1-a" or "1(a)" or "1-a", use "1-a" as the key
- If you see "Q1(b)" or "Q1-b" or "1(b)" or "1-b", use "1-b" as the key
- If you see "Q1" or "1" (without subparts), use "1" as the key
- Always preserve the exact format: main number, then dash, then subpart letter (lowercase)
- Examples: "Q1(a)" → "1-a", "2(b)" → "2-b", "Q3" → "3", "4a" → "4-a"
- For top-left format: If question "1" is followed by answers labeled "a", "b", "c" → map to "1-a", "1-b", "1-c"

HANDLING MISSING QUESTION NUMBERS:
- If a student writes an answer but NO question number is visible, use SEQUENTIAL numbering based on the order answers appear on the page
- For answers without question numbers, assign them sequential keys: "seq-1", "seq-2", "seq-3", etc. based on reading order (top to bottom, left to right)
- If you see multiple answers without question numbers, number them sequentially: first answer → "seq-1", second answer → "seq-2", etc.
- If some answers have question numbers and some don't, use sequential numbering only for the ones without numbers
- Example: If you see answer 1 (no number), answer 2 (no number), Q3 answer → use "seq-1", "seq-2", "3"
- IMPORTANT: Even if question numbers are missing, STILL extract the answer text - it will be matched to the correct question later

IMPORTANT:
- Identify each question number EXACTLY as it appears, then normalize to database format.
- Pay special attention to top-left corner labels (a, b, c, etc.) that may be sub-questions.
- Extract the full question text (if visible) or infer from context.
- Extract the complete answer for each question - EVEN IF NO QUESTION NUMBER IS VISIBLE.
- If a question or answer is not present, use an empty string.
- For PDFs, process all pages and extract questions from all pages.
- When in doubt about question numbering, use the context (what question number appeared before) to determine the correct mapping.
- For answers without question numbers, use sequential keys ("seq-1", "seq-2", etc.) to preserve order.

Return ONLY a JSON object in this exact format:
{
  "1": {"question": "Full text of question 1", "answer": "Student's answer for question 1"},
  "1-a": {"question": "Full text of question 1 part a", "answer": "Student's answer for 1-a"},
  "1-b": {"question": "Full text of question 1 part b", "answer": "Student's answer for 1-b"},
  "2": {"question": "Full text of question 2", "answer": "Student's answer for question 2"},
  "seq-1": {"question": "", "answer": "Answer text when no question number is visible (first answer)"},
  "seq-2": {"question": "", "answer": "Answer text when no question number is visible (second answer)"}
}

Note: Use "seq-N" keys ONLY for answers where no question number is visible. Always extract the answer text even if question number is missing.

Return ONLY the JSON, no other text.`;

  // Determine the correct mime type
  const validMimeType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'].includes(mimeType) 
    ? mimeType 
    : 'image/jpeg';

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: validMimeType, data: base64Data } }
      ]
    }],
  };

  try {
    const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
    
    // Retry with exponential backoff for 503/429 errors
    const res = await retryWithBackoff(async () => {
      return await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout
      });
    });
    
    let output = res.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Clean markdown if present
    output = output.trim();
    if (output.startsWith("```")) {
      const lines = output.split("\n");
      output = lines.slice(1, -1).join("\n");
      if (output.startsWith("json")) {
        output = output.substring(4).trim();
      }
    }
    
    return JSON.parse(output);
  } catch (error) {
    const statusCode = error.response?.status;
    const errorData = error.response?.data;
    
    console.error('Gemini extraction error:', {
      status: statusCode,
      data: errorData,
      message: error.message
    });
    
    // Handle specific error codes
    if (statusCode === 503) {
      throw new Error('AI service is temporarily unavailable. This could be due to high traffic or maintenance. Please try again in a few moments.');
    } else if (statusCode === 429) {
      throw new Error('API rate limit exceeded. Please wait a moment and try again.');
    } else if (statusCode === 400) {
      const errorMsg = errorData?.error?.message || error.message;
      throw new Error(`Invalid request: ${errorMsg}`);
    } else if (statusCode === 401 || statusCode === 403) {
      throw new Error('API authentication failed. Please check your API key configuration.');
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('Request timed out. The file might be too large or the service is slow. Please try again.');
    } else {
      throw new Error(`Failed to extract from file: ${error.message || 'Unknown error occurred'}`);
    }
  }
}

/**
 * Evaluate student answer against correct answer using Gemini
 * Returns: { marks, max_marks, reason, matched_concepts[], missing_concepts[] }
 */
export async function evaluateAnswer(questionText, correctAnswer, studentAnswer, maxMarks = 10) {
  const prompt = `You are an expert exam evaluator. Evaluate the student's answer based on the provided model answer.

QUESTION:
${questionText}

CORRECT/MODEL ANSWER:
${correctAnswer}

STUDENT'S ANSWER:
${studentAnswer}

EVALUATION RULES:
1.  **Compare Concepts:** Focus on whether the student understood the core concepts, not just keyword matching.
2.  **Award Marks:** Grant marks based on the level of understanding demonstrated.
3.  **Be Fair:** Give credit for alternative phrasing if the meaning is correct.
4.  **Maximum Marks:** The maximum marks for this question is ${maxMarks}.

Return ONLY a valid JSON object with the following structure:
{
  "marks": <calculated_marks>,
  "max_marks": ${maxMarks},
  "reason": "A brief explanation for the awarded marks, highlighting what the student got right and wrong.",
  "matched_concepts": ["list", "of", "correct", "concepts"],
  "missing_concepts": ["list", "of", "missing", "concepts"]
}`;

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
  };

  try {
    const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
    
    // Retry with exponential backoff for 503/429 errors
    const res = await retryWithBackoff(async () => {
      return await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout
      });
    });
    
    let output = res.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Clean markdown if present
    output = output.trim();
    if (output.startsWith("```")) {
      const lines = output.split("\n");
      output = lines.slice(1, -1).join("\n");
      if (output.startsWith("json")) {
        output = output.substring(4).trim();
      }
    }
    
    return JSON.parse(output);
  } catch (error) {
    const statusCode = error.response?.status;
    const errorData = error.response?.data;
    
    console.error('Evaluation error:', {
      status: statusCode,
      data: errorData,
      message: error.message
    });
    
    // Handle specific error codes
    let errorMessage = 'Evaluation error occurred';
    if (statusCode === 503) {
      errorMessage = 'AI service is temporarily unavailable. Please try again in a few moments.';
    } else if (statusCode === 429) {
      errorMessage = 'API rate limit exceeded. Please wait a moment and try again.';
    } else if (statusCode === 400) {
      errorMessage = `Invalid request: ${errorData?.error?.message || error.message}`;
    } else if (statusCode === 401 || statusCode === 403) {
      errorMessage = 'API authentication failed. Please check your API key configuration.';
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage = 'Request timed out. Please try again.';
    } else {
      errorMessage = `Evaluation error: ${error.message || 'Unknown error occurred'}`;
    }
    
    return {
      marks: 0,
      max_marks: maxMarks,
      reason: errorMessage,
      matched_concepts: [],
      missing_concepts: []
    };
  }
}
