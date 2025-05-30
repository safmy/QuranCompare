#!/usr/bin/env python3
"""
Simple Newsletter Scraper for Masjid Tucson Newsletters
Scrapes newsletters from known URL patterns
"""

import requests
from bs4 import BeautifulSoup
import json
import os
import time
import re
from urllib.parse import urljoin
from datetime import datetime
import openai
from openai import OpenAI
import numpy as np
import faiss
import logging
from typing import List, Dict, Optional

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NewsletterScraper")

class SimpleNewsletterScraper:
    def __init__(self, openai_api_key: str):
        self.base_url = "https://www.masjidtucson.org/publications/books/sp/"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        
        # Initialize OpenAI client
        self.client = OpenAI(api_key=openai_api_key)
        
        # Storage
        self.newsletters = []
        self.failed_urls = []
        
        # Known years and months (from your example URL)
        self.years = ['1985', '1986', '1987', '1988', '1989', '1990', '1991', '1992', '1993', '1994', '1995']
        self.months = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
        ]
    
    def scrape_newsletter_page(self, page_url: str) -> Optional[Dict]:
        """Scrape content from a single newsletter page"""
        try:
            response = self.session.get(page_url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract title from the page
            title = ""
            title_tag = soup.find('title')
            if title_tag:
                title = title_tag.get_text().strip()
            
            # Look for h1 tags which often contain article titles
            if not title or 'page' in title.lower():
                h1_tags = soup.find_all('h1')
                if h1_tags:
                    title = h1_tags[0].get_text().strip()
            
            # Extract main content
            content_parts = []
            
            # Remove unwanted elements
            for element in soup(["script", "style", "nav", "header", "footer", "link", "meta"]):
                element.decompose()
            
            # Look for paragraphs and divs with actual content
            for element in soup.find_all(['p', 'div', 'td'], text=True):
                text = element.get_text().strip()
                if len(text) > 20 and not text.startswith('<!--'):  # Skip very short text and comments
                    content_parts.append(text)
            
            # Join content
            content = ' '.join(content_parts)
            
            # Clean up content
            content = re.sub(r'\s+', ' ', content).strip()
            content = re.sub(r'(Page \d+)+', '', content)  # Remove page numbers
            content = re.sub(r'Masjid Tucson', '', content)  # Remove site navigation
            
            # Extract date info from URL
            url_parts = page_url.split('/')
            year = month = page = ""
            
            for i, part in enumerate(url_parts):
                if part.isdigit() and len(part) == 4:  # Year
                    year = part
                    if i + 1 < len(url_parts):
                        month = url_parts[i + 1]
                elif 'page' in part:
                    page = part.replace('.html', '')
            
            # Skip if content is too short
            if len(content) < 100:
                logger.warning(f"Skipping {page_url} - content too short ({len(content)} chars)")
                return None
            
            # Create newsletter entry
            newsletter = {
                'title': title or f"Newsletter {year}/{month} {page}",
                'content': content,
                'url': page_url,
                'year': year,
                'month': month,
                'page': page,
                'scraped_at': datetime.now().isoformat(),
                'word_count': len(content.split())
            }
            
            logger.info(f"Scraped: {newsletter['title']} ({newsletter['word_count']} words)")
            return newsletter
            
        except Exception as e:
            logger.error(f"Error scraping {page_url}: {e}")
            self.failed_urls.append(page_url)
            return None
    
    def scrape_newsletters(self, start_year: int = 1985, end_year: int = 1990, max_pages: int = 50) -> List[Dict]:
        """Scrape newsletters by testing URL patterns"""
        logger.info(f"Starting newsletter scraping from {start_year} to {end_year}")
        
        target_years = [str(y) for y in range(start_year, end_year + 1)]
        total_scraped = 0
        
        for year in target_years:
            if total_scraped >= max_pages:
                logger.info(f"Reached maximum pages limit ({max_pages})")
                break
                
            logger.info(f"Processing year {year}")
            
            for month in self.months:
                if total_scraped >= max_pages:
                    break
                    
                logger.info(f"Processing {year}/{month}")
                
                # Try common page patterns
                for page_num in range(1, 5):  # Most newsletters have 1-4 pages
                    if total_scraped >= max_pages:
                        break
                        
                    page_url = f"{self.base_url}{year}/{month}/page{page_num}.html"
                    
                    newsletter = self.scrape_newsletter_page(page_url)
                    if newsletter:
                        self.newsletters.append(newsletter)
                        total_scraped += 1
                    
                    # Be respectful - add delay between requests
                    time.sleep(0.5)
        
        logger.info(f"Scraping complete. Total newsletters: {len(self.newsletters)}")
        logger.info(f"Failed URLs: {len(self.failed_urls)}")
        
        return self.newsletters
    
    def create_embeddings(self, newsletters: List[Dict]) -> List[np.ndarray]:
        """Create embeddings for newsletter content"""
        logger.info(f"Creating embeddings for {len(newsletters)} newsletters")
        
        embeddings = []
        
        for i, newsletter in enumerate(newsletters):
            try:
                # Combine title and content for embedding
                text = f"{newsletter['title']}\n\n{newsletter['content']}"
                
                # Truncate if too long (OpenAI has token limits)
                if len(text) > 8000:  # Conservative limit
                    text = text[:8000] + "..."
                
                response = self.client.embeddings.create(
                    input=text,
                    model="text-embedding-ada-002"
                )
                
                embedding = np.array(response.data[0].embedding, dtype=np.float32)
                embeddings.append(embedding)
                
                if (i + 1) % 5 == 0:
                    logger.info(f"Created embeddings for {i + 1}/{len(newsletters)} newsletters")
                
                # Rate limiting
                time.sleep(0.2)
                
            except Exception as e:
                logger.error(f"Error creating embedding for newsletter {i}: {e}")
                # Create zero embedding as placeholder
                embeddings.append(np.zeros(1536, dtype=np.float32))
        
        logger.info(f"Created {len(embeddings)} embeddings")
        return embeddings
    
    def save_to_files(self, output_dir: str = "./"):
        """Save newsletters and embeddings to files"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save metadata
        metadata_file = os.path.join(output_dir, "newsletters.json")
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(self.newsletters, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved {len(self.newsletters)} newsletters to {metadata_file}")
        
        # Create and save embeddings
        if self.newsletters:
            embeddings = self.create_embeddings(self.newsletters)
            
            # Create FAISS index
            if embeddings:
                dimension = len(embeddings[0])
                index = faiss.IndexFlatL2(dimension)
                embeddings_array = np.array(embeddings)
                index.add(embeddings_array)
                
                # Save FAISS index
                faiss_file = os.path.join(output_dir, "newsletters.faiss")
                faiss.write_index(index, faiss_file)
                
                logger.info(f"Saved FAISS index with {index.ntotal} vectors to {faiss_file}")
        
        # Save failed URLs for debugging
        if self.failed_urls:
            failed_file = os.path.join(output_dir, "failed_urls.txt")
            with open(failed_file, 'w') as f:
                for url in self.failed_urls:
                    f.write(f"{url}\n")
            logger.info(f"Saved {len(self.failed_urls)} failed URLs to {failed_file}")

def main():
    """Main function to run the scraper"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Scrape Masjid Tucson newsletters")
    parser.add_argument("--api-key", required=True, help="OpenAI API key")
    parser.add_argument("--start-year", type=int, default=1985, help="Start year")
    parser.add_argument("--end-year", type=int, default=1987, help="End year")
    parser.add_argument("--max-pages", type=int, default=20, help="Maximum pages to scrape")
    parser.add_argument("--output-dir", default="./newsletter_data", help="Output directory")
    
    args = parser.parse_args()
    
    scraper = SimpleNewsletterScraper(args.api_key)
    
    newsletters = scraper.scrape_newsletters(
        start_year=args.start_year,
        end_year=args.end_year,
        max_pages=args.max_pages
    )
    
    if newsletters:
        scraper.save_to_files(args.output_dir)
        logger.info("Scraping completed successfully!")
    else:
        logger.error("No newsletters were scraped")

if __name__ == "__main__":
    main()