# AI Debater Backend API Specification

## Enhanced Debate Endpoint: `/debate/enhanced`

The enhanced endpoint should return the following structure:

```json
{
  "response": "The AI's text response to the user",
  "relatedVerses": [
    {
      "sura_verse": "46:15",
      "english": "We enjoined the human being to honor his parents...",
      "arabic": "وَوَصَّيْنَا الْإِنسَانَ بِوَالِدَيْهِ...",
      "footnote": "The age of forty is mentioned as the age of maturity"
    }
  ],
  "searchResults": [
    {
      "title": "Audio 47 - Introduction to Blue Quran Sura",
      "content": "At minute 46, Rashad explains the age of responsibility is 40...",
      "collection": "RashadAllMedia",
      "youtube_link": "https://youtu.be/_-nk8hFC6Eg?t=2760"
    }
  ],
  "rootAnalysis": [
    {
      "root": "ب-ل-غ",
      "meaning": "to reach, attain maturity",
      "frequency": 65
    }
  ],
  "suggestedTabs": ["verse-lookup", "semantic-search"],
  "citations": [
    {
      "type": "verse",
      "reference": "46:15",
      "content": "Age of responsibility"
    }
  ]
}
```

## Implementation Requirements

1. **Related Verses**: Query the Quran database for verses related to the topic discussed
2. **Search Results**: Search RashadAllMedia and other collections for relevant content
3. **Root Analysis**: Extract Arabic roots from mentioned verses and provide analysis
4. **Critical Rules**: Use the provided critical rules to ensure accurate responses

## Fallback Behavior

If the enhanced endpoint fails or doesn't return related data, the frontend will:
1. Fall back to the regular `/debate` endpoint
2. Display a note that enhanced features are unavailable
3. Continue functioning with basic debate capabilities