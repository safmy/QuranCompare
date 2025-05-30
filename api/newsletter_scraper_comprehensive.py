#!/usr/bin/env python3
"""
Comprehensive Newsletter Scraper for Masjid Tucson Newsletters
Scrapes ALL content from newsletters without truncation
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
from typing import List, Dict, Optional, Set

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("NewsletterScraper")

class ComprehensiveNewsletterScraper:
    def __init__(self, openai_api_key: str):
        self.base_url = "https://www.masjidtucson.org/publications/books/sp/"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        
        # Initialize OpenAI client
        self.client = OpenAI(api_key=openai_api_key)
        
        # Storage
        self.newsletters = []
        self.failed_urls = []
        self.scraped_urls = set()  # Track what we've already scraped
        
        # Known patterns
        self.years = list(range(1985, 2025))  # All possible years
        self.months = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december',
            'jan', 'feb', 'mar', 'apr', 'may', 'jun',
            'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
        ]
    
    def extract_all_content(self, soup: BeautifulSoup) -> str:
        """Extract ALL text content from the page comprehensively"""
        # Remove unwanted elements
        for element in soup(['script', 'style', 'meta', 'link', 'noscript']):
            element.decompose()
        
        # Try multiple strategies to get content
        content_parts = []
        
        # Strategy 1: Look for main content containers
        main_containers = soup.find_all(['td', 'div', 'article', 'main'], 
                                      attrs={'width': ['100%', '50%', '45%']})
        
        for container in main_containers:
            text = container.get_text(separator=' ', strip=True)
            if len(text) > 50:  # Only add substantial text
                content_parts.append(text)
        
        # Strategy 2: Get all paragraphs and table cells with content
        for element in soup.find_all(['p', 'td', 'div']):
            text = element.get_text(separator=' ', strip=True)
            if len(text) > 30 and text not in content_parts:
                content_parts.append(text)
        
        # Strategy 3: If still not much content, get everything from body
        if len(' '.join(content_parts)) < 200:
            body = soup.find('body')
            if body:
                all_text = body.get_text(separator=' ', strip=True)
                content_parts.append(all_text)
        
        # Combine all content
        full_content = ' '.join(content_parts)
        
        # Clean up
        full_content = re.sub(r'\s+', ' ', full_content)
        full_content = re.sub(r'(Page \d+\s*)+', ' ', full_content)
        full_content = re.sub(r'Masjid Tucson(\s+Masjid Tucson)*', 'Masjid Tucson', full_content)
        
        return full_content.strip()
    
    def find_all_pages_for_issue(self, year: str, month: str) -> List[str]:
        """Find all available pages for a given year/month issue"""
        pages = []
        
        # Try up to 20 pages (most issues have 4-8 pages)
        for page_num in range(1, 21):
            page_url = f"{self.base_url}{year}/{month}/page{page_num}.html"
            
            try:
                response = self.session.head(page_url, allow_redirects=True)
                if response.status_code == 200:
                    pages.append(page_url)
                else:
                    # If we get 404, assume no more pages
                    if response.status_code == 404 and page_num > 1:
                        break
            except:
                # Network error, try next page
                pass
        
        return pages
    
    def scrape_newsletter_page(self, page_url: str) -> Optional[Dict]:
        """Scrape comprehensive content from a single newsletter page"""
        if page_url in self.scraped_urls:
            logger.info(f"Already scraped: {page_url}")
            return None
            
        try:
            logger.info(f"Scraping: {page_url}")
            response = self.session.get(page_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract title - try multiple approaches
            title = ""
            
            # Try <title> tag
            title_tag = soup.find('title')
            if title_tag:
                title = title_tag.get_text().strip()
            
            # Try h1 tags
            if not title or len(title) < 10:
                h1_tags = soup.find_all('h1')
                for h1 in h1_tags:
                    h1_text = h1.get_text().strip()
                    if len(h1_text) > len(title):
                        title = h1_text
            
            # Extract comprehensive content
            content = self.extract_all_content(soup)
            
            # Extract metadata from URL
            url_parts = page_url.split('/')
            year = month = page = ""
            
            for i, part in enumerate(url_parts):
                if part.isdigit() and len(part) == 4:
                    year = part
                    if i + 1 < len(url_parts):
                        month = url_parts[i + 1]
                elif 'page' in part:
                    page = part.replace('.html', '')
            
            # Don't skip short content - some pages might be genuinely short
            if len(content) < 50:
                logger.warning(f"Short content ({len(content)} chars) for {page_url}")
            
            # Create newsletter entry
            newsletter = {
                'title': title or f"Newsletter {year}/{month} {page}",
                'content': content,
                'url': page_url,
                'year': year,
                'month': month,
                'page': page,
                'scraped_at': datetime.now().isoformat(),
                'word_count': len(content.split()),
                'char_count': len(content)
            }
            
            self.scraped_urls.add(page_url)
            logger.info(f"✓ Scraped: {newsletter['title']} ({newsletter['word_count']} words, {newsletter['char_count']} chars)")
            
            return newsletter
            
        except Exception as e:
            logger.error(f"Error scraping {page_url}: {e}")
            self.failed_urls.append(page_url)
            return None
    
    def scrape_all_newsletters(self, start_year: int = 1985, end_year: int = None) -> List[Dict]:
        """Scrape ALL newsletters comprehensively"""
        if end_year is None:
            end_year = datetime.now().year
        
        logger.info(f"Starting comprehensive newsletter scraping from {start_year} to {end_year}")
        
        for year in range(start_year, end_year + 1):
            year_str = str(year)
            logger.info(f"\n{'='*50}")
            logger.info(f"Processing year {year}")
            logger.info(f"{'='*50}")
            
            for month in self.months[:12]:  # Only use full month names
                logger.info(f"\nChecking {year}/{month}...")
                
                # Find all pages for this issue
                pages = self.find_all_pages_for_issue(year_str, month)
                
                if pages:
                    logger.info(f"Found {len(pages)} pages for {year}/{month}")
                    
                    for page_url in pages:
                        newsletter = self.scrape_newsletter_page(page_url)
                        if newsletter:
                            self.newsletters.append(newsletter)
                        
                        # Be respectful
                        time.sleep(0.5)
                else:
                    logger.debug(f"No pages found for {year}/{month}")
        
        logger.info(f"\n{'='*50}")
        logger.info(f"Scraping complete!")
        logger.info(f"Total newsletters scraped: {len(self.newsletters)}")
        logger.info(f"Failed URLs: {len(self.failed_urls)}")
        logger.info(f"{'='*50}")
        
        return self.newsletters
    
    def create_embeddings(self, newsletters: List[Dict], batch_size: int = 20) -> List[np.ndarray]:
        """Create embeddings for newsletter content with batching"""
        logger.info(f"Creating embeddings for {len(newsletters)} newsletters...")
        
        embeddings = []
        
        for i in range(0, len(newsletters), batch_size):
            batch = newsletters[i:i+batch_size]
            batch_texts = []
            
            for newsletter in batch:
                # Combine all newsletter fields for comprehensive embedding
                text_parts = [
                    f"Title: {newsletter['title']}",
                    f"Year: {newsletter['year']}",
                    f"Month: {newsletter['month']}",
                    f"Content: {newsletter['content']}"
                ]
                
                text = "\n".join(text_parts)
                
                # Truncate if too long
                if len(text) > 8000:
                    text = text[:8000] + "..."
                
                batch_texts.append(text)
            
            try:
                # Create embeddings for batch
                response = self.client.embeddings.create(
                    input=batch_texts,
                    model="text-embedding-ada-002"
                )
                
                for embedding_data in response.data:
                    embedding = np.array(embedding_data.embedding, dtype=np.float32)
                    embeddings.append(embedding)
                
                logger.info(f"Created embeddings for newsletters {i+1}-{i+len(batch)}/{len(newsletters)}")
                
                # Rate limiting
                time.sleep(0.5)
                
            except Exception as e:
                logger.error(f"Error creating embeddings for batch starting at {i}: {e}")
                # Add zero embeddings for failed batch
                for _ in batch:
                    embeddings.append(np.zeros(1536, dtype=np.float32))
        
        logger.info(f"Created {len(embeddings)} embeddings")
        return embeddings
    
    def save_to_files(self, output_dir: str = "./newsletter_data"):
        """Save newsletters and embeddings to files"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save metadata
        metadata_file = os.path.join(output_dir, "newsletters_comprehensive.json")
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
                faiss_file = os.path.join(output_dir, "newsletters_comprehensive.faiss")
                faiss.write_index(index, faiss_file)
                
                logger.info(f"Saved FAISS index with {index.ntotal} vectors to {faiss_file}")
        
        # Save failed URLs
        if self.failed_urls:
            failed_file = os.path.join(output_dir, "failed_urls_comprehensive.txt")
            with open(failed_file, 'w') as f:
                for url in self.failed_urls:
                    f.write(f"{url}\n")
            logger.info(f"Saved {len(self.failed_urls)} failed URLs to {failed_file}")
        
        # Save summary statistics
        stats = {
            "total_newsletters": len(self.newsletters),
            "total_words": sum(n['word_count'] for n in self.newsletters),
            "total_chars": sum(n['char_count'] for n in self.newsletters),
            "years_covered": sorted(list(set(n['year'] for n in self.newsletters))),
            "average_words_per_page": sum(n['word_count'] for n in self.newsletters) / len(self.newsletters) if self.newsletters else 0,
            "scraped_at": datetime.now().isoformat()
        }
        
        stats_file = os.path.join(output_dir, "scraping_stats.json")
        with open(stats_file, 'w') as f:
            json.dump(stats, f, indent=2)
        
        logger.info(f"\nScraping Statistics:")
        logger.info(f"- Total newsletters: {stats['total_newsletters']}")
        logger.info(f"- Total words: {stats['total_words']:,}")
        logger.info(f"- Total characters: {stats['total_chars']:,}")
        logger.info(f"- Years covered: {', '.join(stats['years_covered'])}")
        logger.info(f"- Average words per page: {stats['average_words_per_page']:.0f}")

def main():
    """Main function to run the comprehensive scraper"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Comprehensively scrape Masjid Tucson newsletters")
    parser.add_argument("--api-key", required=True, help="OpenAI API key")
    parser.add_argument("--start-year", type=int, default=1985, help="Start year")
    parser.add_argument("--end-year", type=int, default=1990, help="End year")
    parser.add_argument("--output-dir", default="./newsletter_data", help="Output directory")
    
    args = parser.parse_args()
    
    scraper = ComprehensiveNewsletterScraper(args.api_key)
    
    newsletters = scraper.scrape_all_newsletters(
        start_year=args.start_year,
        end_year=args.end_year
    )
    
    if newsletters:
        scraper.save_to_files(args.output_dir)
        logger.info("\n✅ Scraping completed successfully!")
    else:
        logger.error("\n❌ No newsletters were scraped")

if __name__ == "__main__":
    main()