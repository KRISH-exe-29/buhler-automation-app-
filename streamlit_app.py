import streamlit as st
import pandas as pd
import numpy as np
import io
import xlsxwriter

st.set_page_config(page_title="Bühler Automation Tool", layout="wide")
st.title("⚙️ Bühler Automation Processing App")
st.markdown("Upload your Excel file with 3 sheets: **Sheet1** (starters), **Sheet2** (equipment), and **Sheet3** (JB info). Processed output will be downloadable.")

uploaded_file = st.file_uploader("Upload Excel File (.xlsx)", type="xlsx")

if uploaded_file:
    try:
        df_starter = pd.read_excel(uploaded_file, sheet_name='Sheet1')
        df_data = pd.read_excel(uploaded_file, sheet_name='Sheet2')
        df_jb = pd.read_excel(uploaded_file, sheet_name='Sheet3')

        df_data = df_data.merge(
            df_jb[['Number', 'Schrank Aufstellungsort Feldkasten Stockwerk']],
            on='Number', how='left')
        df_data.rename(columns={'Schrank Aufstellungsort Feldkasten Stockwerk': 'JB'}, inplace=True)

        ranges = df_starter[df_starter['starters'].isin(['DOL', 'SD', 'SS'])]['KW']
        Range = ranges.tolist() if len(ranges) >= 2 else [0, 10]

        def pow(row):
            k = str(row['Power']).strip()
            if k in ["---", ""]:
                return 0
            if k[-1] == 'W':
                return pd.to_numeric(k[:-1], errors='coerce') / 1000
            elif k[-1] == 'A':
                return pd.to_numeric(k[:-2], errors='coerce') / 1000
            return pd.to_numeric(k, errors='coerce')

        def cat(row):
            n = str(row['Number'])
            m = str(row['Machine'])
            three_char = n[-5:-2]
            if three_char == 'MXZ': return 'M'
            if three_char in ['BPS','SHE','PAZ','BLH','BQS','SCS','EXL','BFT','BSA','BZS','QXV','BLL','XCJ']:
                return 'MA' if three_char in ['XCJ','EXL','QXV'] and m[:4] in ['MVSL','MQRH','MVRT','MQRF'] else 'A'
            if three_char in ['QYS','SHC','PWC','BZA','KCU','BST','BTT','BRE','KCL','KFC','RIN','BWE']:
                return 'MA'
            return ''

        def cat1(row):
            n = str(row['Number'])
            m = str(row['Machine'])
            power_value = row['X']
            three_char = n[-5:-2]
            remarks = row['Remarks']
            if power_value <= Range[0] and (three_char == 'MXZ' and remarks not in ['SC-S-P=BA','SC-S-P','SC-S-M=BM','SC-S-P=BM']):
                if m[:4] in ['MTRC', 'MTRA', 'MQRH', 'MQRF']:
                    return 'RDDOL'
                elif m[:4] in ['MTSD', 'MPAV','MPAW','MPAU']:
                    return 'RDOL'
                elif m == 'FAN':
                    return 'DOL_F'
                else:
                    return 'DOL'
            elif power_value >= Range[1] and (three_char == 'MXZ' and remarks not in ['SC-S-P=BA','SC-S-P','SC-S-M=BM','SC-S-P=BM']):
                return 'SS'
            elif three_char == 'MXZ' and remarks in ['SC-S-P=BA','SC-S-P','SC-S-M=BM','SC-S-P=BM']:
                return 'VFD_VA=BA' if remarks == 'SC-S-P=BA' else 'VFD_VA=GB'
            return 'NA'

        df_data['X'] = df_data.apply(pow, axis=1)
        df_data['Types'] = df_data.apply(cat, axis=1)
        df_data['Feeders'] = df_data.apply(cat1, axis=1)

        for col in ['8 DI','8 DO','4 DI','4 DO','AI','AO','c/o','S/S']:
            df_data[col] = 0  # Placeholder for now

        total_power = df_data['X'].sum()
        total_current = pd.to_numeric(df_data['Current'], errors='coerce').fillna(0).sum()

        st.success(f"✅ Processed successfully. Total Power = {total_power:.1f} kW, Total Current = {total_current:.1f} A")

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df_data.to_excel(writer, sheet_name='Sheet1', index=False)
        output.seek(0)

        st.download_button(
            label="📥 Download Processed Excel File",
            data=output,
            file_name="processed_output.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    except Exception as e:
        st.error(f"❌ Error processing file: {e}")
