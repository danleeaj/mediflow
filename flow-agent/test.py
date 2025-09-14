import requests

url = 'https://jzyhllxxkkwfryebzvdn.supabase.co/functions/v1/get-patient-tests'
headers = {
    'Authorization': 'Bearer sb_publishable_XLSGi6ODTjNGv09KuveIAw_f8AED19R',
    'apikey': 'sb_publishable_XLSGi6ODTjNGv09KuveIAw_f8AED19R'
}

# Patient ID to query
patient_id = "00000000-0000-0000-0000-000000000000"

# Method 1: Using params (cleaner)
params = {'patient_id': patient_id}
response = requests.get(url, headers=headers, params=params)

message = ""

if response.status_code == 200:
    result = response.json()
    for record in result['data']:
        message += f"{record['test']} : {record['content']}\n"
    
    print(message)
        
else:
    # return f"Error: Failed to retrieve results for patient {patient_id}. Either patient_id is wrong or there is no historical data."
    print(f"Error: Failed to retrieve results for patient {patient_id}. Either patient_id is wrong or there is no historical data.")