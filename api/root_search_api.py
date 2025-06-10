"""
Root search endpoint for the API
Handles root-based searches similar to Discord bot's rt: functionality
"""

from typing import List, Optional, Dict
from pydantic import BaseModel
import re

class RootSearchRequest(BaseModel):
    query: str
    search_type: str = "root"  # "root", "english", "arabic", "smart"
    limit: int = 100

class RootSearchResponse(BaseModel):
    verses: List[dict]
    total_found: int
    search_info: dict

def search_verses_by_root(verses_data: List[dict], query: str, search_type: str = "root", limit: int = 100):
    """
    Search verses by root pattern
    """
    results = []
    search_info = {
        "query": query,
        "search_type": search_type,
        "roots_searched": []
    }
    
    # Parse root queries (can be multiple roots with OR)
    if " OR " in query:
        root_queries = [q.strip() for q in query.split(" OR ")]
    else:
        root_queries = [query.strip()]
    
    # Extract roots from rt: prefix if present
    roots_to_search = []
    for rq in root_queries:
        if rq.startswith("rt:"):
            roots_to_search.append(rq[3:].strip())
        else:
            roots_to_search.append(rq.strip())
    
    search_info["roots_searched"] = roots_to_search
    
    # Search through verses
    for verse in verses_data:
        if not verse.get("roots"):
            continue
            
        verse_roots = [r.strip() for r in verse["roots"].split(",")]
        
        # Check if any of the search roots match any verse roots
        found = False
        for search_root in roots_to_search:
            if search_root in verse_roots:
                found = True
                break
        
        if found:
            results.append(verse)
            if len(results) >= limit:
                break
    
    return {
        "verses": results,
        "total_found": len(results),
        "search_info": search_info
    }

def search_verses_by_text(verses_data: List[dict], query: str, field: str = "english", limit: int = 100):
    """
    Search verses by text content
    """
    results = []
    query_lower = query.lower()
    
    for verse in verses_data:
        if field in verse and verse[field]:
            if query_lower in verse[field].lower():
                results.append(verse)
                if len(results) >= limit:
                    break
    
    return results