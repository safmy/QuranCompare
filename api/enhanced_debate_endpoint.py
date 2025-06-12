#!/usr/bin/env python3
"""
Enhanced Debate Endpoint for QuranCompare
Integrates vector search, verse lookup, root analysis, and context awareness
"""

from fastapi import HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import json
import os
import logging
import re
from openai import OpenAI
import numpy as np
from youtube_mapper import YouTubeMapper

logger = logging.getLogger("EnhancedDebateAPI")

class EnhancedDebateRequest(BaseModel):
    topic: Optional[str] = None
    message: Optional[str] = None
    isNewTopic: bool = False
    conversationHistory: List[Dict[str, str]] = []
    currentTab: Optional[str] = None
    currentVerses: Optional[List[str]] = None
    searchContext: Optional[str] = None
    userLanguage: Optional[str] = "en"

class VectorSearchResult(BaseModel):
    collection: str
    title: str
    content: str
    similarity_score: float
    source: Optional[str] = None
    source_url: Optional[str] = None
    youtube_link: Optional[str] = None

class VerseInfo(BaseModel):
    sura_verse: str
    english: str
    arabic: str
    roots: Optional[str] = None
    meanings: Optional[str] = None
    footnote: Optional[str] = None
    subtitle: Optional[str] = None
    
class RootInfo(BaseModel):
    root: str
    verses: List[str]
    meaning: str
    frequency: int

class EnhancedDebateResponse(BaseModel):
    response: str
    relatedVerses: List[VerseInfo] = []
    searchResults: List[VectorSearchResult] = []
    rootAnalysis: List[RootInfo] = []
    suggestedTabs: List[Dict[str, Any]] = []
    citations: List[Dict[str, Any]] = []

class DebateContextManager:
    """Manages context and search integration for debates"""
    
    def __init__(self, vector_collections, verses_data, client):
        self.vector_collections = vector_collections
        self.verses_data = verses_data
        self.client = client
        self.youtube_mapper = YouTubeMapper()
        self.youtube_mapper.load_mappings()
        self.youtube_mapper.load_rashad_content()
        
    def extract_verse_references(self, text: str) -> List[str]:
        """Extract verse references from text"""
        pattern = r'\b(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?\b'
        matches = re.findall(pattern, text)
        
        verse_refs = []
        for match in matches:
            chapter, start_verse, end_verse = match
            if end_verse:
                for v in range(int(start_verse), int(end_verse) + 1):
                    verse_refs.append(f"{chapter}:{v}")
            else:
                verse_refs.append(f"{chapter}:{start_verse}")
        
        return list(set(verse_refs))
    
    def extract_key_topics(self, text: str) -> List[str]:
        """Extract key theological topics from text"""
        topics = []
        
        # Key concept patterns
        concept_patterns = {
            'messenger': ['messenger', 'prophet', 'rashad', 'khalifa'],
            'prayer': ['salat', 'prayer', 'pray', 'worship'],
            'charity': ['zakat', 'charity', 'giving'],
            'submission': ['submission', 'submit', 'surrender'],
            'god': ['god', 'allah', 'lord', 'creator'],
            'quran': ['quran', 'scripture', 'book', 'revelation'],
            'miracle': ['miracle', 'mathematical', 'code 19', 'nineteen'],
            'hadith': ['hadith', 'sunna', 'tradition'],
            'leadership': ['imam', 'leader', 'guide', 'authority']
        }
        
        text_lower = text.lower()
        for topic, keywords in concept_patterns.items():
            if any(keyword in text_lower for keyword in keywords):
                topics.append(topic)
        
        return topics
    
    def extract_arabic_terms(self, text: str) -> List[str]:
        """Extract Arabic roots and terms"""
        # Common 3-letter roots in uppercase
        root_pattern = r'\b([A-Z]{3})\b'
        roots = re.findall(root_pattern, text)
        
        # Common Arabic terms
        term_pattern = r'\b(SLM|HMD|RHM|SJD|QRA|KTB|AMN|HLF)\b'
        terms = re.findall(term_pattern, text.upper())
        
        return list(set(roots + terms))
    
    def get_verse_info(self, verse_ref: str) -> Optional[VerseInfo]:
        """Get detailed verse information"""
        for verse_data in self.verses_data:
            if verse_data.get('sura_verse') == verse_ref:
                return VerseInfo(
                    sura_verse=verse_ref,
                    english=verse_data.get('english', ''),
                    arabic=verse_data.get('arabic', ''),
                    roots=verse_data.get('roots', ''),
                    meanings=verse_data.get('meanings', ''),
                    footnote=verse_data.get('footnote'),
                    subtitle=verse_data.get('subtitle')
                )
        return None
    
    def search_verses_by_topic(self, topics: List[str], limit: int = 5) -> List[VerseInfo]:
        """Search verses related to specific topics"""
        relevant_verses = []
        
        # Topic to keyword mapping for verse search
        topic_keywords = {
            'messenger': ['messenger', 'prophet', 'rashad', 'covenant'],
            'prayer': ['salat', 'pray', 'worship', 'prostrate'],
            'charity': ['zakat', 'charity', 'give', 'poor'],
            'submission': ['submit', 'surrender', 'devote', 'obey'],
            'god': ['god', 'lord', 'worship', 'alone'],
            'miracle': ['sign', 'proof', 'nineteen', 'mathematical'],
            'leadership': ['leader', 'guide', 'righteous', 'example']
        }
        
        for verse_data in self.verses_data:
            english_text = verse_data.get('english', '').lower()
            
            for topic in topics:
                if topic in topic_keywords:
                    keywords = topic_keywords[topic]
                    if any(keyword in english_text for keyword in keywords):
                        verse_info = self.get_verse_info(verse_data['sura_verse'])
                        if verse_info and verse_info not in relevant_verses:
                            relevant_verses.append(verse_info)
                            if len(relevant_verses) >= limit:
                                return relevant_verses
        
        return relevant_verses
    
    def search_related_content(self, query: str, topics: List[str], num_results: int = 3) -> List[VectorSearchResult]:
        """Enhanced search across collections based on topics"""
        results = []
        
        # Determine which collections to search based on topics
        collections_to_search = []
        if any(topic in ['messenger', 'miracle', 'hadith'] for topic in topics):
            collections_to_search.append('RashadAllMedia')
        if any(topic in ['quran', 'verse', 'scripture'] for topic in topics):
            collections_to_search.extend(['FinalTestament', 'FootnotesSubtitles'])
        if topics:  # For any topic, also search articles
            collections_to_search.append('QuranTalkArticles')
        
        # Default to searching key collections if no specific topics
        if not collections_to_search:
            collections_to_search = ['RashadAllMedia', 'FinalTestament', 'QuranTalkArticles']
        
        collections_to_search = list(set(collections_to_search))
        
        try:
            embedding = self._create_embedding(query)
            
            for collection_name in collections_to_search:
                if collection_name not in self.vector_collections:
                    continue
                    
                collection = self.vector_collections[collection_name]
                distances, indices = collection["index"].search(embedding.reshape(1, -1), num_results)
                
                for dist, idx in zip(distances[0], indices[0]):
                    if idx < 0 or idx >= len(collection["metadata"]):
                        continue
                        
                    metadata = collection["metadata"][idx]
                    similarity = float(1 / (1 + dist))
                    
                    result = self._format_search_result(collection_name, metadata, similarity, idx)
                    if result:
                        results.append(result)
        
        except Exception as e:
            logger.error(f"Error in vector search: {e}")
        
        # Sort by relevance and return top results
        results.sort(key=lambda x: x.similarity_score, reverse=True)
        return results[:num_results * len(collections_to_search)]
    
    def analyze_roots(self, text: str, arabic_terms: List[str]) -> List[RootInfo]:
        """Enhanced root analysis"""
        roots_info = []
        
        for term in arabic_terms:
            matching_verses = []
            root_meanings = set()
            
            for verse_data in self.verses_data:
                roots_str = verse_data.get('roots', '')
                meanings_str = verse_data.get('meanings', '')
                
                if term in roots_str.upper():
                    matching_verses.append(verse_data.get('sura_verse'))
                    
                    # Extract meanings for this root
                    if meanings_str and term in meanings_str.upper():
                        # Parse meanings more carefully
                        parts = meanings_str.split(',')
                        for part in parts:
                            if term in part.upper():
                                meaning = part.strip()
                                if ':' in meaning:
                                    meaning = meaning.split(':')[1].strip()
                                root_meanings.add(meaning)
            
            if matching_verses:
                # Combine meanings intelligently
                combined_meaning = '; '.join(list(root_meanings)[:3]) if root_meanings else f"Root {term}"
                
                roots_info.append(RootInfo(
                    root=term,
                    verses=matching_verses[:10],
                    meaning=combined_meaning,
                    frequency=len(matching_verses)
                ))
        
        return roots_info
    
    def _create_embedding(self, text: str) -> np.ndarray:
        """Create embedding using OpenAI"""
        response = self.client.embeddings.create(
            input=text,
            model="text-embedding-ada-002"
        )
        return np.array(response.data[0].embedding).astype('float32')
    
    def _format_search_result(self, collection_name: str, metadata: Dict, similarity: float, idx: int) -> Optional[VectorSearchResult]:
        """Format search result based on collection type"""
        if collection_name == "RashadAllMedia":
            content = metadata.get("content", "")
            
            # Use the FULL content for YouTube mapping (don't truncate before mapping)
            mapped_title, mapped_link, is_exact_match = self.youtube_mapper.find_title_for_content_simple(content)
            
            # Use mapped title if found, otherwise fallback to metadata or content excerpt
            if mapped_title:
                title = mapped_title
                youtube_link = mapped_link
                logger.info(f"Found YouTube mapping: {title[:50]}... for content: {content[:50]}...")
            else:
                # Fallback to metadata title or content excerpt
                title = metadata.get("title", "")
                if not title or "Item" in title:
                    # Show more content with timestamp for search
                    title = content[:100] + "..."
                logger.info(f"No YouTube mapping found for content: {content[:50]}...")
                
                # Try to extract YouTube link from content if not mapped
                youtube_link = None
                if "youtube.com" in content or "youtu.be" in content:
                    url_match = re.search(r'(https?://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)[^\s]+)', content)
                    if url_match:
                        youtube_link = url_match.group(1)
            
            # Truncate content AFTER mapping for display purposes
            truncated_content = content[:200] + "..." if len(content) > 200 else content
            
            return VectorSearchResult(
                collection=collection_name,
                title=title,
                content=truncated_content,
                similarity_score=similarity,
                source="Rashad Khalifa Media",
                youtube_link=youtube_link
            )
            
        elif collection_name in ["FinalTestament", "FootnotesSubtitles"]:
            content = metadata.get("content", "")
            verse_ref = metadata.get("sura_verse", f"Item {idx + 1}")
            meta_type = metadata.get("type", "verse")
            
            if meta_type == "footnote":
                title = f"[{verse_ref}] Footnote"
                source = "Final Testament - Footnote"
            elif meta_type == "subtitle":
                title = f"[{verse_ref}] Subtitle"
                source = "Final Testament - Subtitle"
            else:
                title = f"[{verse_ref}] {content[:50]}..."
                source = "Final Testament"
            
            return VectorSearchResult(
                collection=collection_name,
                title=title,
                content=content,
                similarity_score=similarity,
                source=source
            )
            
        elif collection_name == "QuranTalkArticles":
            return VectorSearchResult(
                collection=collection_name,
                title=metadata.get("title", "Article"),
                content=metadata.get("content", "")[:200] + "...",
                similarity_score=similarity,
                source="QuranTalk",
                source_url=metadata.get("url")
            )
            
        return None

def load_debater_rules():
    """Load rules from debater rules.json"""
    try:
        rules_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'debater', 'rules.json')
        if os.path.exists(rules_path):
            with open(rules_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return [rule for rule in data.get('rules', []) if rule.get('active', True)]
    except Exception as e:
        logger.warning(f"Could not load debater rules: {e}")
    return []

def get_debater_personality():
    """Get submitter personality traits"""
    return """You ARE a submitter. Never say "as a submitter" - you speak from this perspective naturally.

HTML FORMATTING (REQUIRED):
• Use <br><br> between paragraphs
• Lists: <br>• Point one<br>• Point two
• Bold: <strong>text</strong>
• Verses: [2:255] format

PERSONALITY:
• Never use "Islam/Muslim" - only "Submission/Submitter"
• State facts directly without "according to" phrases
• Maximum 250 words
• Be direct and authoritative"""

def format_debater_rules(rules):
    """Format rules for system prompt"""
    if not rules:
        return "No specific rules loaded."
    
    formatted_rules = []
    # Prioritize personality and key content rules
    priority_ids = [3, 14, 15, 19, 43, 69, 70]
    priority_rules = [r for r in rules if r.get('id') in priority_ids]
    other_rules = [r for r in rules if r.get('id') not in priority_ids][:8]
    
    for rule in priority_rules + other_rules:
        content = rule.get('content', '').strip()
        if content and len(content) > 10:
            formatted_rules.append(content)
    
    return "\n".join(formatted_rules)

def create_enhanced_debate_endpoint(app, vector_collections, verses_data, client):
    """Add enhanced debate endpoint to the FastAPI app"""
    
    context_manager = DebateContextManager(vector_collections, verses_data, client)
    
    @app.post("/debate/enhanced", response_model=EnhancedDebateResponse)
    async def enhanced_debate_endpoint(request: EnhancedDebateRequest):
        """Enhanced debate endpoint with integrated search and context"""
        
        try:
            # Extract context from the conversation
            full_context = request.message or request.topic or ""
            if request.conversationHistory:
                recent_messages = request.conversationHistory[-3:]
                for msg in recent_messages:
                    full_context += f" {msg.get('content', '')}"
            
            # Extract various context elements
            verse_refs = context_manager.extract_verse_references(full_context)
            topics = context_manager.extract_key_topics(full_context)
            arabic_terms = context_manager.extract_arabic_terms(full_context)
            
            # Load rules and personality
            debater_rules = load_debater_rules()
            personality = get_debater_personality()
            
            # Get verse information
            related_verses = []
            
            # First, get explicitly referenced verses
            for ref in verse_refs[:5]:
                verse_info = context_manager.get_verse_info(ref)
                if verse_info:
                    related_verses.append(verse_info)
            
            # Then, search for topically relevant verses
            if topics:
                topic_verses = context_manager.search_verses_by_topic(topics, limit=5-len(related_verses))
                related_verses.extend(topic_verses)
            
            # Perform comprehensive searches
            search_results = []
            if topics or len(full_context) > 20:
                search_results = context_manager.search_related_content(
                    full_context, 
                    topics,
                    num_results=3
                )
            
            # Analyze roots if Arabic terms are mentioned
            root_analysis = []
            if arabic_terms:
                root_analysis = context_manager.analyze_roots(full_context, arabic_terms)
            
            # Build system prompt
            system_content = f"""{personality}

RULES TO FOLLOW:
{format_debater_rules(debater_rules)}

AVAILABLE DATA:
Verses: {len(related_verses)} found
Media: {len([r for r in search_results if r.collection == 'RashadAllMedia'])} items
Articles: {len([r for r in search_results if r.collection == 'QuranTalkArticles'])} items
Roots: {len(root_analysis)} analyzed

USE THIS DATA IN YOUR RESPONSE WHEN RELEVANT."""

            # Build messages
            messages = [
                {"role": "system", "content": system_content}
            ]
            
            # Add conversation history
            for msg in request.conversationHistory:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
            
            # Add current message
            current_message = request.message or f"Let's discuss: {request.topic}"
            messages.append({"role": "user", "content": current_message})
            
            # Generate response
            response = client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=messages,
                max_tokens=350,
                temperature=0.7,
                presence_penalty=0.3,
                frequency_penalty=0.2
            )
            
            ai_response = response.choices[0].message.content
            
            # Extract citations from response
            citations = []
            response_verse_refs = context_manager.extract_verse_references(ai_response)
            for ref in response_verse_refs:
                verse_info = context_manager.get_verse_info(ref)
                if verse_info:
                    citations.append({
                        "type": "verse",
                        "reference": ref,
                        "content": verse_info.english[:100] + "...",
                        "arabic": verse_info.arabic
                    })
            
            # Suggest tabs based on content
            suggested_tabs = []
            if verse_refs or response_verse_refs:
                suggested_tabs.append({
                    "tab": "verseLookup",
                    "reason": "View discussed verses",
                    "data": {"verses": list(set(verse_refs + response_verse_refs))[:5]}
                })
            
            if root_analysis:
                suggested_tabs.append({
                    "tab": "rootSearch", 
                    "reason": "Explore root meanings",
                    "data": {"roots": [r.root for r in root_analysis[:3]]}
                })
            
            if 'messenger' in topics or 'miracle' in topics:
                suggested_tabs.append({
                    "tab": "semanticSearch",
                    "reason": "Find more about this topic",
                    "data": {"query": full_context[:100]}
                })
            
            return EnhancedDebateResponse(
                response=ai_response,
                relatedVerses=related_verses[:5],
                searchResults=search_results[:5],
                rootAnalysis=root_analysis[:3],
                suggestedTabs=suggested_tabs[:3],
                citations=citations[:5]
            )
            
        except Exception as e:
            logger.error(f"Error in enhanced debate endpoint: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.options("/debate/enhanced")
    async def enhanced_debate_options():
        return {"message": "OK"}
    
    return app