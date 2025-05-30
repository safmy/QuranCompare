#!/usr/bin/env python3
"""
Newsletter Scraper for Masjid Tucson Newsletters
Scrapes and processes newsletters from https://www.masjidtucson.org/publications/books/sp/
"""

import requests
from bs4 import BeautifulSoup
import json
import os
import time
import re
from urllib.parse import urljoin, urlparse
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

class NewsletterScraper:
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
        
    def get_available_years(self) -> List[str]:
        """Get list of available years from the main page"""
        try:
            response = self.session.get(self.base_url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            years = []
            
            # Look for year links (directories)
            for link in soup.find_all('a', href=True):
                href = link['href']
                # Match year directories (4 digits followed by /)
                if re.match(r'^\d{4}/$', href):
                    year = href.rstrip('/')
                    years.append(year)
            
            years.sort()
            logger.info(f"Found {len(years)} years: {years}")
            return years
            
        except Exception as e:
            logger.error(f"Error getting available years: {e}")
            return []
    
    def get_available_months(self, year: str) -> List[str]:
        """Get list of available months for a given year"""
        try:
            url = urljoin(self.base_url, f"{year}/")
            response = self.session.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            months = []
            
            # Look for month directories
            for link in soup.find_all('a', href=True):
                href = link['href']
                # Common month names
                if href.rstrip('/').lower() in [
                    'january', 'february', 'march', 'april', 'may', 'june',
                    'july', 'august', 'september', 'october', 'november', 'december',
                    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
                    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
                ]:
                    months.append(href.rstrip('/'))
            
            logger.info(f"Found {len(months)} months for {year}: {months}")
            return months
            
        except Exception as e:
            logger.error(f"Error getting months for {year}: {e}")
            return []
    
    def get_newsletter_pages(self, year: str, month: str) -> List[str]:
        """Get list of newsletter page URLs for a given year/month"""
        try:
            url = urljoin(self.base_url, f"{year}/{month}/")
            response = self.session.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            pages = []
            
            # Look for page HTML files
            for link in soup.find_all('a', href=True):
                href = link['href']
                if href.endswith('.html') and 'page' in href.lower():
                    page_url = urljoin(url, href)
                    pages.append(page_url)
            
            pages.sort()  # Sort by page number
            logger.info(f"Found {len(pages)} pages for {year}/{month}")
            return pages
            
        except Exception as e:
            logger.error(f"Error getting pages for {year}/{month}: {e}")
            return []
    
    def scrape_newsletter_page(self, page_url: str) -> Optional[Dict]:
        """Scrape content from a single newsletter page"""
        try:
            response = self.session.get(page_url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract title
            title = ""
            title_tag = soup.find('title')
            if title_tag:
                title = title_tag.get_text().strip()
            
            # If no title in <title> tag, look for h1, h2, etc.
            if not title:
                for header in soup.find_all(['h1', 'h2', 'h3']):
                    title = header.get_text().strip()
                    if title:
                        break
            
            # Extract main content
            content = ""
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "header", "footer"]):
                script.decompose()
            
            # Try to find main content area
            main_content = soup.find('main') or soup.find('article') or soup.find('div', class_=re.compile(r'content|main|article', re.I))
            
            if main_content:
                content = main_content.get_text()
            else:
                # Fallback: get all text from body
                body = soup.find('body')
                if body:
                    content = body.get_text()
                else:
                    content = soup.get_text()
            
            # Clean up content
            content = re.sub(r'\s+', ' ', content).strip()
            
            # Extract date info from URL
            url_parts = urlparse(page_url).path.split('/')
            year = month = page = ""
            
            for i, part in enumerate(url_parts):
                if part.isdigit() and len(part) == 4:  # Year
                    year = part
                    if i + 1 < len(url_parts):
                        month = url_parts[i + 1]
                elif 'page' in part.lower():
                    page = part
            
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
    
    def scrape_all_newsletters(self, start_year: int = 1985, end_year: int = None, max_pages: int = 100) -> List[Dict]:
        """Scrape all available newsletters within the specified year range"""
        if end_year is None:
            end_year = datetime.now().year
        
        logger.info(f"Starting newsletter scraping from {start_year} to {end_year}")
        
        years = self.get_available_years()
        target_years = [y for y in years if start_year <= int(y) <= end_year]
        
        total_scraped = 0
        
        for year in target_years:
            if total_scraped >= max_pages:
                logger.info(f"Reached maximum pages limit ({max_pages})")
                break
                
            logger.info(f"Processing year {year}")
            months = self.get_available_months(year)
            
            for month in months:
                if total_scraped >= max_pages:
                    break
                    
                logger.info(f"Processing {year}/{month}")
                pages = self.get_newsletter_pages(year, month)
                
                for page_url in pages:
                    if total_scraped >= max_pages:
                        break
                        
                    newsletter = self.scrape_newsletter_page(page_url)
                    if newsletter:
                        self.newsletters.append(newsletter)
                        total_scraped += 1
                    
                    # Be respectful - add delay between requests
                    time.sleep(1)
        
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
                
                if (i + 1) % 10 == 0:
                    logger.info(f"Created embeddings for {i + 1}/{len(newsletters)} newsletters")
                
                # Rate limiting
                time.sleep(0.1)
                
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
    parser.add_argument("--end-year", type=int, default=None, help="End year")
    parser.add_argument("--max-pages", type=int, default=50, help="Maximum pages to scrape")
    parser.add_argument("--output-dir", default="./", help="Output directory")
    
    args = parser.parse_args()
    
    scraper = NewsletterScraper(args.api_key)
    
    # Test with a small sample first
    newsletters = scraper.scrape_all_newsletters(
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