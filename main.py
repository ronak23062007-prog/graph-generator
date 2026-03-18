import eel
import pandas as pd
import json
import os
import tkinter as tk
from tkinter import filedialog

# Start eel serving from the 'web' folder
eel.init('web')

@eel.expose
def open_file_dialog():
    root = tk.Tk()
    root.attributes('-topmost', True)
    root.withdraw()
    filepath = filedialog.askopenfilename(
        title="Select CSV Data File",
        filetypes=[("CSV files", "*.csv"), ("All files", "*.*")]
    )
    
    if filepath:
        try:
            # 1. Enterprise Sniffing & Bad Char Ignore
            import csv
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                head = f.read(8192)
            try:
                dialect = csv.Sniffer().sniff(head)
                df = pd.read_csv(filepath, delimiter=dialect.delimiter, on_bad_lines='skip', low_memory=False)
            except Exception:
                df = pd.read_csv(filepath, sep=None, engine='python', on_bad_lines='skip')
                
            if len(df.columns) == 0:
                raise Exception("Could not detect tabular columns.")
                
            # Clean column names & drop garbage/IDs
            df.columns = [str(c).strip() for c in df.columns]
            cols_to_drop = [c for c in df.columns if c.lower() in ('id', 'uuid', 'index', 'key')]
            cols_to_drop += [c for c in df.columns if c.lower().startswith('unnamed')]
            df.drop(columns=cols_to_drop, inplace=True, errors='ignore')
            
            # 2. Chronological Sorting & Axis Auto-Detection
            label_col = None
            date_col = None
            
            # Hunt explicitly for date-like columns
            for col in df.columns:
                if any(kw in col.lower() for kw in ['date', 'time', 'stamp', 'year', 'month']):
                    try:
                        # Attempt rapid conversion
                        df[col] = pd.to_datetime(df[col], infer_datetime_format=True)
                        date_col = col
                        break
                    except:
                        pass
            
            if date_col is None:
                for col in df.columns:
                    if pd.api.types.is_datetime64_any_dtype(df[col]):
                        date_col = col
                        break
                        
            if date_col:
                # Force strictly chronological data flow for zig-zag prevention
                df = df.sort_values(by=date_col)
                label_col = date_col
                df[label_col] = df[label_col].dt.strftime('%Y-%m-%d %H:%M')
            else:
                for col in df.columns:
                    if df[col].dtype == 'object':
                        label_col = col
                        break
                if label_col is None:
                    label_col = df.columns[0]
                    
            # 3. Decimation (Anti-Lag Memory Protection for Big Data)
            MAX_POINTS = 3000
            if len(df) > MAX_POINTS:
                step = len(df) // MAX_POINTS
                df = df.iloc[::step].copy()
                
            labels = df[label_col].fillna("Missing").astype(str).tolist()
            
            # 4. Smart Quantitative Extraction
            datasets = []
            for col in df.columns:
                if col == label_col:
                    continue
                
                if df[col].dtype == 'object':
                    cleaned = df[col].astype(str).str.replace(r'[^\d\.\-]', '', regex=True)
                    cleaned = cleaned.replace('', np.nan)
                    numeric_data = pd.to_numeric(cleaned, errors='coerce')
                else:
                    numeric_data = pd.to_numeric(df[col], errors='coerce')
                    
                # Strict sparse rejection: Only graph columns with at least 10% valid data
                if numeric_data.isna().mean() < 0.90:
                    # Edge-fill first to anchor endpoints, then interpolate interior gaps
                    numeric_data = numeric_data.ffill().bfill().interpolate(method='linear').fillna(0)
                    datasets.append({
                        'label': str(col),
                        'data': numeric_data.tolist()
                    })
                    
            # 5. Log Analysis Fallback (Categorical counting)
            if len(datasets) == 0:
                counts = df[label_col].value_counts().head(100)
                labels = counts.index.astype(str).tolist()
                datasets.append({
                    'label': f'Occurrence ({label_col})',
                    'data': counts.values.tolist()
                })
            
            return json.dumps({
                'status': 'success',
                'filename': os.path.basename(filepath),
                'labels': labels,
                'datasets': datasets
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return json.dumps({'status': 'error', 'message': str(e)})
    else:
        return json.dumps({'status': 'canceled'})

if __name__ == '__main__':
    # Start app (will open in Chrome/Edge running as app mode)
    try:
        eel.start('index.html', size=(1200, 800), port=8002)
    except Exception as e:
        print("Could not start eel app mode, trying default browser", e)
        # fallback for systems without Chrome/Edge
        eel.start('index.html', size=(1200, 800), mode='default', port=8002)
