import os
import time
import csv
import re
import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, StaleElementReferenceException

# Base directory for output
base_dir = "quran_manuscripts"
os.makedirs(base_dir, exist_ok=True)

# CSV file for metadata
csv_file = os.path.join(base_dir, "manuscript_data.csv")

# Dictionary to track which verses we've already scraped
scraped_verses = {}
# Dictionary to track manuscripts available for each verse
available_manuscripts_by_verse = {}

# Load Uthmani text as reference
uthmani_text = {}

def load_uthmani_text():
    """Load the Uthmani text file as reference"""
    global uthmani_text
    try:
        with open('quran-uthmani.txt', 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        current_sura = 1
        current_verse = 1
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Skip bismillah headers
            if line.startswith("بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ") and "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ" == line:
                continue
                
            # Store the text by sura and verse
            if (current_sura, current_verse) not in uthmani_text:
                uthmani_text[(current_sura, current_verse)] = line
            
            current_verse += 1
            if current_verse > SURA_VERSE_COUNTS[current_sura - 1]:
                current_sura += 1
                current_verse = 1
                
        print(f"Loaded Uthmani text with {len(uthmani_text)} verses")
    except Exception as e:
        print(f"Error loading Uthmani text: {e}")
        return False
    
    return True

# Quranic sura verse counts (1-indexed)
SURA_VERSE_COUNTS = [
    7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
    111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73,
    54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60,
    49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52,
    44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19,
    26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3,
    6, 3, 5, 4, 5, 6
]

def sort_csv_by_sura_verse():
    """Sort the CSV file by sura and verse numbers"""
    if not os.path.exists(csv_file):
        print("CSV file doesn't exist yet, nothing to sort")
        return
    
    try:
        # Read the CSV file
        df = pd.read_csv(csv_file)
        
        # Convert Sura and Verse columns to numeric if they aren't already
        df['Sura'] = pd.to_numeric(df['Sura'])
        df['Verse'] = pd.to_numeric(df['Verse'])
        
        # Sort by Sura and Verse
        df_sorted = df.sort_values(by=['Sura', 'Verse'])
        
        # Save the sorted DataFrame back to CSV
        df_sorted.to_csv(csv_file, index=False)
        print(f"CSV file sorted by Sura and Verse")
        
        return df_sorted
    except Exception as e:
        print(f"Error sorting CSV file: {e}")
        return None

def comprehensive_analysis():
    """Perform comprehensive analysis of what's missing from the dataset"""
    print("\nPerforming comprehensive analysis of missing verses...")
    
    # Track all missing chapters and verses
    completely_missing_chapters = []
    incomplete_chapters = []
    
    # Check each chapter against the expected verse count
    for sura in range(1, 115):  # Quran has 114 suras
        if sura <= len(SURA_VERSE_COUNTS):
            expected_verse_count = SURA_VERSE_COUNTS[sura - 1]
            
            # Count verses we have for this sura
            sura_verses = {verse for (s, verse) in scraped_verses.keys() if s == sura}
            
            if not sura_verses:
                completely_missing_chapters.append(sura)
            elif len(sura_verses) < expected_verse_count:
                missing_verses = [v for v in range(1, expected_verse_count + 1) if v not in sura_verses]
                incomplete_chapters.append((sura, missing_verses))
    
    # Report findings
    if completely_missing_chapters:
        print(f"Completely missing chapters: {completely_missing_chapters}")
    
    if incomplete_chapters:
        print(f"Chapters with missing verses:")
        for sura, missing_verses in incomplete_chapters:
            print(f"  Sura {sura}: Missing {len(missing_verses)} verses - {missing_verses[:10]}{'...' if len(missing_verses) > 10 else ''}")
    
    if not completely_missing_chapters and not incomplete_chapters:
        print("Dataset is complete! All chapters and verses are present.")
    
    return completely_missing_chapters, incomplete_chapters

# Load existing data if available
if os.path.exists(csv_file):
    print(f"Loading existing data from {csv_file}")
    
    # First sort the CSV file
    sort_csv_by_sura_verse()
    
    # Then load the data into our dictionary
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader, None)  # Skip header
        if header:  # Only process if file has content
            for row in reader:
                if len(row) >= 3:  # Ensure row has enough data
                    try:
                        sura, verse = int(row[0]), int(row[1])
                        manuscript = row[2]
                        
                        if (sura, verse) not in scraped_verses:
                            scraped_verses[(sura, verse)] = set()
                        
                        scraped_verses[(sura, verse)].add(manuscript)
                    except (ValueError, IndexError) as e:
                        print(f"Error parsing row {row}: {e}")
    
    print(f"Loaded data for {len(scraped_verses)} verses")
else:
    # Create new CSV file with header
    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Sura', 'Verse', 'Manuscript', 'Text', 'Uthmani Text', 'Source URL'])

# Load Uthmani text reference
load_uthmani_text()

# Setup Chrome WebDriver
chrome_options = Options()
chrome_options.add_argument("--headless")  # Run in headless mode
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--window-size=1920,1080")
chrome_options.add_argument("--disable-extensions")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
driver = webdriver.Chrome(options=chrome_options)

def get_manuscripts_for_verse(sura_num, verse_num, retry_count=3):
    """Get list of available manuscripts for a verse with retries"""
    url = f"https://elktb.net/A/{sura_num}/{verse_num}"
    
    for attempt in range(retry_count):
        try:
            driver.get(url)
            # Add a longer timeout for manuscript table to load
            try:
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.ID, "mushaflistesitablosu"))
                )
            except TimeoutException:
                print(f"Timeout waiting for table on attempt {attempt+1} for Sura {sura_num}, Verse {verse_num}")
                if attempt < retry_count - 1:
                    time.sleep(5)  # Wait before retry
                    continue
                return []
            
            # Add a delay to ensure all content is loaded
            time.sleep(3)
            
            # Get manuscript names - more robust selection
            manuscripts = []
            rows = driver.find_elements(By.CSS_SELECTOR, "#mushafbilgileri tr")
            
            if not rows:
                print(f"No manuscript rows found on attempt {attempt+1}")
                if attempt < retry_count - 1:
                    time.sleep(5)
                    continue
                return []
                
            for row in rows:
                try:
                    # Different approach to find manuscript names
                    manuscript_element = row.find_element(By.CSS_SELECTOR, ".baslik")
                    manuscript_name = manuscript_element.text.strip()
                    if manuscript_name:  # Only add if not empty
                        manuscripts.append(manuscript_name)
                except (NoSuchElementException, StaleElementReferenceException):
                    continue
            
            # If we found manuscripts, cache them for this verse and return
            if manuscripts:
                available_manuscripts_by_verse[(sura_num, verse_num)] = set(manuscripts)
                return manuscripts
                
            # If we got here but no manuscripts, retry if attempts remain
            if attempt < retry_count - 1:
                print(f"No manuscripts found on attempt {attempt+1}, retrying...")
                time.sleep(5)
            else:
                print(f"No manuscripts found after {retry_count} attempts")
                return []
                
        except Exception as e:
            print(f"Error on attempt {attempt+1} checking manuscripts for Sura {sura_num}, Verse {verse_num}: {e}")
            if attempt < retry_count - 1:
                time.sleep(5)
            else:
                return []
    
    return []

def extract_text_from_row(row):
    """Extract the text from a manuscript row more reliably"""
    try:
        # First try to get all span elements containing words
        text_elements = row.find_elements(By.CSS_SELECTOR, ".metin span")
        text_parts = []
        
        for elem in text_elements:
            # Try to get text content (may contain ∗ characters for unreadable text)
            try:
                text = elem.find_element(By.CSS_SELECTOR, "a").text.strip()
                text_parts.append(text)
            except:
                # If can't find link text, try the span's title attribute instead
                title = elem.get_attribute("title")
                if title and " - " in title:
                    # Extract the actual Arabic text from title if available
                    parts = title.split(" - ")
                    if len(parts) >= 2:
                        arabic_text = parts[1].strip()
                        if arabic_text:
                            text_parts.append(arabic_text)
                        else:
                            text_parts.append("*unreadable*")
                    else:
                        text_parts.append("*unreadable*")
                else:
                    text_parts.append("*unreadable*")
        
        return " ".join(text_parts).strip()
    except Exception as e:
        print(f"Error extracting text: {e}")
        return "*error*"

def scrape_verse(sura_num, verse_num, retry_count=3):
    """Scrape a specific verse from all manuscripts with improved extraction and retries"""
    url = f"https://elktb.net/A/{sura_num}/{verse_num}"
    print(f"Scraping Sura {sura_num}, Verse {verse_num}")
    
    # Create directory structure
    sura_dir = os.path.join(base_dir, f"sura_{sura_num}")
    verse_dir = os.path.join(sura_dir, f"verse_{verse_num}")
    os.makedirs(verse_dir, exist_ok=True)
    
    manuscripts_found = []
    
    for attempt in range(retry_count):
        try:
            driver.get(url)
            
            # Wait for the table to load with increased timeout
            try:
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.ID, "mushaflistesitablosu"))
                )
            except TimeoutException:
                print(f"  Timeout waiting for table on attempt {attempt+1}")
                if attempt < retry_count - 1:
                    time.sleep(5)  # Wait before retry
                    continue
                return False
            
            # Add pause to ensure JavaScript rendering is complete
            time.sleep(3)
            
            # Get the manuscript rows
            rows = driver.find_elements(By.CSS_SELECTOR, "#mushafbilgileri tr")
            
            if not rows:
                print(f"  No rows found on attempt {attempt+1}")
                if attempt < retry_count - 1:
                    time.sleep(5)
                    continue
                return False
            
            # Get all available manuscripts for this verse if we haven't already
            if (sura_num, verse_num) not in available_manuscripts_by_verse:
                manuscript_names = []
                for row in rows:
                    try:
                        manuscript_element = row.find_element(By.CSS_SELECTOR, ".baslik")
                        manuscript_name = manuscript_element.text.strip()
                        if manuscript_name:
                            manuscript_names.append(manuscript_name)
                    except NoSuchElementException:
                        continue
                
                if manuscript_names:
                    available_manuscripts_by_verse[(sura_num, verse_num)] = set(manuscript_names)
            
            # Get the Uthmani text reference for this verse
            uthmani_reference = uthmani_text.get((sura_num, verse_num), "")
            
            # Process each row to extract manuscript text
            for row in rows:
                try:
                    # Extract manuscript name with better error handling
                    try:
                        manuscript_element = row.find_element(By.CSS_SELECTOR, ".baslik")
                        manuscript_name = manuscript_element.text.strip()
                    except NoSuchElementException:
                        print("  Could not find manuscript name element, skipping row")
                        continue
                        
                    if not manuscript_name:
                        print("  Empty manuscript name, skipping row")
                        continue
                    
                    # Check if we already have this manuscript for this verse
                    if (sura_num, verse_num) in scraped_verses and manuscript_name in scraped_verses[(sura_num, verse_num)]:
                        print(f"  Already have manuscript: {manuscript_name}")
                        manuscripts_found.append(manuscript_name)
                        continue
                        
                    # Format manuscript name for filename
                    filename = ''.join(c if c.isalnum() else '_' for c in manuscript_name)
                    
                    # Extract text with improved method
                    full_text = extract_text_from_row(row)
                    
                    # Try clicking copy button as well to get text from clipboard
                    try:
                        copy_button = row.find_element(By.CSS_SELECTOR, ".bi-copy")
                        copy_button.click()
                        time.sleep(0.5)  # Give time for clipboard operation
                    except:
                        pass  # It's okay if copy button fails
                    
                    # Save to file
                    file_path = os.path.join(verse_dir, f"{filename}.txt")
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(full_text)
                        if uthmani_reference:
                            f.write("\n\nUthmani Reference:\n")
                            f.write(uthmani_reference)
                    
                    # Add to CSV
                    with open(csv_file, 'a', newline='', encoding='utf-8') as f:
                        writer = csv.writer(f)
                        writer.writerow([sura_num, verse_num, manuscript_name, full_text, uthmani_reference, url])
                        
                    # Update our tracking
                    if (sura_num, verse_num) not in scraped_verses:
                        scraped_verses[(sura_num, verse_num)] = set()
                    scraped_verses[(sura_num, verse_num)].add(manuscript_name)
                    
                    manuscripts_found.append(manuscript_name)
                    print(f"  Saved manuscript: {manuscript_name}")
                    
                except Exception as e:
                    print(f"  Error processing row: {e}")
            
            # If we found at least one manuscript, consider it a success
            if manuscripts_found:
                # Check if there are more manuscripts that we couldn't get
                if (sura_num, verse_num) in available_manuscripts_by_verse:
                    expected = available_manuscripts_by_verse[(sura_num, verse_num)]
                    missing = expected - set(manuscripts_found) - scraped_verses.get((sura_num, verse_num), set())
                    if missing:
                        print(f"  Still missing {len(missing)} manuscripts: {', '.join(missing)}")
                        # We'll consider this attempt successful even if some manuscripts are missing
                return True
            
            # If we didn't find any manuscripts and have attempts left, retry
            if not manuscripts_found and attempt < retry_count - 1:
                print(f"  No manuscripts found on attempt {attempt+1}, retrying...")
                time.sleep(5)
            
        except Exception as e:
            print(f"  Error on attempt {attempt+1}: {e}")
            if attempt < retry_count - 1:
                time.sleep(5)
    
    return len(manuscripts_found) > 0

def check_specific_verse(sura_num, verse_num, retry_count=5):
    """Focus scraping on a specific verse with multiple retries"""
    print(f"Focusing on Sura {sura_num}, Verse {verse_num}")
    
    success = False
    for attempt in range(retry_count):
        print(f"Attempt {attempt+1} of {retry_count}")
        if scrape_verse(sura_num, verse_num):
            success = True
            break
        else:
            print(f"Failed attempt {attempt+1}, waiting before retry...")
            time.sleep(7)  # Longer wait between retries
    
    return success

def verify_online_verse_counts():
    """Verify verse counts against the online source to ensure accuracy"""
    print("\nVerifying verse counts against online source...")
    
    discrepancies = []
    
    for sura in range(1, 115):  # Quran has 114 suras
        if sura <= len(SURA_VERSE_COUNTS):
            expected = SURA_VERSE_COUNTS[sura - 1]
            
            # Check online
            url = f"https://elktb.net/A/{sura}/1"
            driver.get(url)
            
            try:
                # Wait for the verse dropdown to load
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.ID, "ayetno"))
                )
                
                # Get verse options
                verse_options = driver.find_elements(By.CSS_SELECTOR, "#ayetno option")
                online_count = len(verse_options)
                
                if online_count != expected:
                    discrepancies.append((sura, expected, online_count))
                    print(f"Discrepancy in Sura {sura}: Expected {expected}, Online shows {online_count}")
                
                # Don't overwhelm the server
                time.sleep(1)
            except Exception as e:
                print(f"Error checking online verse count for Sura {sura}: {e}")
    
    if discrepancies:
        print("\nFound discrepancies in verse counts:")
        for sura, expected, online in discrepancies:
            print(f"Sura {sura}: Expected {expected}, Online shows {online}")
        
        # Update our counts for the discrepancies
        for sura, _, online in discrepancies:
            if online > 0:  # Only update if we got a valid count
                SURA_VERSE_COUNTS[sura - 1] = online
                print(f"Updated verse count for Sura {sura} to {online}")
    else:
        print("All verse counts match the online source.")

def process_missing_verses(missing_chapters, incomplete_chapters):
    """Process all missing chapters and verses"""
    # First handle completely missing chapters
    if missing_chapters:
        print("\nProcessing completely missing chapters...")
        for sura in missing_chapters:
            verse_count = SURA_VERSE_COUNTS[sura - 1] if sura <= len(SURA_VERSE_COUNTS) else 0
            
            if verse_count == 0:
                # Try to get verse count from website
                url = f"https://elktb.net/A/{sura}/1"
                driver.get(url)
                
                try:
                    WebDriverWait(driver, 10).until(
                        EC.presence_of_element_located((By.ID, "ayetno"))
                    )
                    verse_options = driver.find_elements(By.CSS_SELECTOR, "#ayetno option")
                    verse_count = len(verse_options)
                except:
                    print(f"Could not determine verse count for Sura {sura}")
                    continue
            
            print(f"Processing Sura {sura} with {verse_count} verses")
            
            # Process each verse
            for verse in range(1, verse_count + 1):
                check_specific_verse(sura, verse, retry_count=3)
                # Don't overwhelm the server
                time.sleep(3)
    
    # Then handle incomplete chapters
    if incomplete_chapters:
        print("\nProcessing chapters with missing verses...")
        for sura, missing_verses in incomplete_chapters:
            print(f"Processing Sura {sura} with {len(missing_verses)} missing verses")
            
            # Process each missing verse
            for verse in missing_verses:
                check_specific_verse(sura, verse, retry_count=3)
                # Don't overwhelm the server
                time.sleep(3)

try:
    # 1. First sort the CSV for better analysis
    sort_csv_by_sura_verse()
    
    # 2. Verify online verse counts to ensure our data is accurate
    verify_online_verse_counts()
    
    # 3. Analyze what's missing from our dataset
    missing_chapters, incomplete_chapters = comprehensive_analysis()
    
    # 4. Process all missing verses
    if missing_chapters or incomplete_chapters:
        process_missing_verses(missing_chapters, incomplete_chapters)
        
        # 5. Sort the CSV again after adding new data
        sort_csv_by_sura_verse()
        
        # 6. Re-analyze to check if we're missing anything
        print("\nFinal analysis after processing:")
        remaining_missing, remaining_incomplete = comprehensive_analysis()
        
        if remaining_missing or remaining_incomplete:
            print("\nWARNING: There are still missing chapters or verses.")
            print("You may need to run the script again to get complete coverage.")
        else:
            print("\nSUCCESS: All chapters and verses have been successfully scraped!")
    else:
        print("\nDataset is already complete. No missing chapters or verses.")
    
    print("\nScraping completed!")
    
finally:
    # Clean up
    driver.quit()