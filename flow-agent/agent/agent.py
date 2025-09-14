from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
import os
from langchain.chat_models import init_chat_model
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage
import random
from twilio.rest import Client
from datetime import datetime
import time


import re

import dotenv
dotenv.load_dotenv()

class State(TypedDict):
    messages: Annotated[list, add_messages]

def call_llm(prompt: str) -> str:
    subprocess_llm = init_chat_model("google_genai:gemini-2.0-flash")
    response = subprocess_llm.invoke([HumanMessage(content=prompt)])
    return response.content

# @tool
# def diagnose_tool(vitals: str) -> str:
#     """Returns a possible diagnosis based on a summary of patient's medical history. The assistant must personally summarize the patient's medical history before calling this tool."""
#     return "cancer"

@tool
def diagnose_tool(vitals: str) -> str:
    """Returns a possible diagnosis based on a summary of patient's medical history. The assistant must personally summarize the patient's medical history before calling this tool."""
    prompt = f"""
    Patient data: {vitals}
    You are a clinical decision-support assistant. Based only on the provided patient data and medical history, decide whether further tests are required.
    TASKS:
    1. Provide a brief explanation of the key findings in the report (what the values or indices mean).
   - If there is an obvious disease and you are very certain, state it clearly as your impression.
    2. Assign a confidence level (1–5) to your impression. 1 is you are absolutely not sure. 5 is you are a hundred percent sure about your diagnosis.
    OUTPUT: concise key findings and diagnose and <confidence integer>
  """

    response = call_llm(prompt).strip()
    m = re.match(r"^\s*([1-5])\s*$", response)
    confidence = int(m.group(1)) if m else 3

    if confidence >= 3:
        impression_prompt = f"""
        Patient data: {vitals}

        Give a concise clinical impression (one sentence).
        """
        impression = call_llm(impression_prompt)
        return f"CLINICAL IMPRESSION: {impression}\nCONFIDENCE: {confidence}/5"
        # return "<need further test>"
    else:
        return "<need further test>"

@tool
def output_diagnosis(diagnosis: str) -> str:
    """Output the final diagnosis."""
    print(f"\n=== DIAGNOSIS REPORT ===")
    print(diagnosis)
    print("=" * 25)
    return f"Diagnosis outputted: {diagnosis}"

@tool
def get_data_tool(patient_id: str) -> str:
    """Returns patient medical history from database."""
    import requests

    url = 'https://jzyhllxxkkwfryebzvdn.supabase.co/functions/v1/get-patient-tests'
    headers = {
        'Authorization': 'Bearer sb_publishable_XLSGi6ODTjNGv09KuveIAw_f8AED19R',
        'apikey': 'sb_publishable_XLSGi6ODTjNGv09KuveIAw_f8AED19R'
    }

    params = {'patient_id': patient_id}
    response = requests.get(url, headers=headers, params=params)

    message = ""

    if response.status_code == 200:
        result = response.json()
        for record in result['data']:
            message += f"{record['test']} : {record['content']}\n"
        return message.strip()
            
    else:
        return f"Error: Failed to retrieve results for patient {patient_id}. Either patient_id is wrong or there is no historical data."

@tool
def notification_tool(message: str) -> str:
    """Sends a notification to the patient via WhatsApp using Twilio."""

    client = Client(os.getenv("ACCOUNT_SID"), os.getenv("AUTH_TOKEN"))

    # Get credentials from environment variables
    account_sid = os.getenv("ACCOUNT_SID")
    auth_token = os.getenv("AUTH_TOKEN")

    # Get phone numbers from environment or use defaults
    sender_number = os.getenv("WHATSAPP_FROM")
    recipient_number = os.getenv("WHATSAPP_TO")

    # Initialize Twilio client
    client = Client(account_sid, auth_token)

    # Send the WhatsApp message
    message_obj = client.messages.create(
        from_=f'whatsapp:+{sender_number}',
        body=message,
        to=f'whatsapp:+{recipient_number}'
    )

    return(f"WhatsApp notification successfully sent to patient at +{recipient_number}. Message ID: {message_obj.sid}")

@tool
def order_test_tool(test_name: str, patient_id: str) -> str:
    """Orders a test for the patient, where patient_id is required."""

    import requests
    url = 'https://jzyhllxxkkwfryebzvdn.supabase.co/functions/v1/create-order'
    headers = {
        'Authorization': 'Bearer sb_publishable_XLSGi6ODTjNGv09KuveIAw_f8AED19R',
        'apikey': 'sb_publishable_XLSGi6ODTjNGv09KuveIAw_f8AED19R',
        'Content-Type': 'application/json'
    }

    data = {
        "patient_id": patient_id,
        "test": test_name
    }
    response = requests.post(url, headers=headers, json=data)

    # for test in test_names:

    #     data = {
    #         "patient_id": patient_id,
    #         "test": test
    #     }
    #     response = requests.post(url, headers=headers, json=data)

    print(f"Ordered {test_name}")
    return f"Ordered {test_name}"

# @tool
# def test_tool(message: str) -> str:
#     """Based on evaluation, determines if additional tests are needed. If yes, returns specific tests."""
#     return "Tumor markers"

@tool
def test_tool(message: str) -> str:
    """Determines if additional diagnostic tests are needed based on patient evaluation."""
    
    test_prompt = """You are a Clinical Decision Support Agent. Based on the patient evaluation provided, determine if additional diagnostic tests are warranted.

PATIENT EVALUATION:
{message}

CARDIAC/VASCULAR:
1. Troponin - Cardiac injury marker
2. CK-MB - Myocardial damage enzyme
3. BNP/NT-proBNP - Heart failure marker
4. D-dimer - Thromboembolism screening

HEMATOLOGY/COAGULATION:
5. Complete Blood Count (CBC) - Cell counts and morphology
6. PT/INR - Coagulation function
7. PTT - Intrinsic coagulation pathway
8. Fibrinogen - Clotting protein level

CHEMISTRY/METABOLIC:
9. Basic Metabolic Panel (BMP) - Electrolytes, kidney function
10. Comprehensive Metabolic Panel (CMP) - Extended chemistry panel
11. Lactate - Tissue hypoperfusion/metabolic stress
12. Arterial Blood Gas (ABG) - Acid-base and oxygenation status
13. Venous Blood Gas (VBG) - Venous pH and CO2
14. Glucose - Blood sugar level
15. HbA1c - Long-term glucose control

LIVER/PANCREAS:
16. Liver Function Tests (LFT) - Hepatic enzyme panel
17. Lipase - Pancreatic enzyme
18. Amylase - Pancreatic/salivary enzyme

INFECTIOUS DISEASE:
19. Blood cultures - Bacteremia detection
20. Respiratory PCR panel - Viral pathogens (COVID-19, Influenza, RSV, etc.)
21. Procalcitonin - Bacterial infection marker
22. C-reactive protein (CRP) - Inflammation marker
23. Erythrocyte Sedimentation Rate (ESR) - Systemic inflammation

ENDOCRINE:
24. Thyroid Function Tests (TFT) - TSH, T3, T4
25. Cortisol - Adrenal function

RENAL/URINARY:
26. Urinalysis - Urine composition and microscopy
27. Creatinine - Kidney function marker

TOXICOLOGY:
28. Urine drug screen - Substance detection
29. Ethanol level - Alcohol concentration
30. Salicylate level - Aspirin toxicity screening

DECISION CRITERIA:
- If clinical picture is clear and diagnosis is evident → No additional tests needed
- If differential diagnosis requires confirmation → Recommend specific tests
- If critical conditions need to be ruled out → Recommend appropriate screening tests

OUTPUT FORMAT:
- If no tests needed: "<no further test>"
- If tests needed: "<test_name>" for each required test
- Output only the test recommendations, no additional text
- Recommend at most 1 test

Provide your recommendation:"""
# - Multiple tests: Separate with spaces (e.g., "<troponin> <d-dimer>")
    
    need_test = call_llm(test_prompt.format(message=message))
    return need_test.strip()

llm = init_chat_model("google_genai:gemini-2.0-flash")

# Remember to use the tools
tools = [diagnose_tool, output_diagnosis, notification_tool, get_data_tool, test_tool, order_test_tool]
llm_with_tools = llm.bind_tools(tools)

def should_continue(state: State):
    """Decide whether the agent should continue or end."""
    messages = state["messages"]
    last_message = messages[-1]
    
    # If the last message has tool calls, continue to tools
    if last_message.tool_calls:
        return "tools"
    # If we've called the output tool, we're done
    if any("notification_tool" in str(msg) for msg in messages[-3:]):
        return "end"
    # Otherwise, continue with the agent
    return "agent"

def call_model(state: State):
    """Let the agent decide what to do next."""
    messages = state["messages"]
    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}

# Create the graph
graph_builder = StateGraph(State)

# Add nodes
graph_builder.add_node("agent", call_model)
graph_builder.add_node("tools", ToolNode(tools))

# Define the flow with conditional logic
graph_builder.add_edge(START, "agent")
graph_builder.add_conditional_edges(
    "agent",
    should_continue,
    {
        "tools": "tools",
        "end": END,
        "agent": "agent"
    }
)
graph_builder.add_edge("tools", "agent")

graph = graph_builder.compile()


# THIS IS THE ENTRY POINT
def process_patient_data(patient_id: str):
    # patient_history = get_patient_history(patient_id)

    time.sleep(5)

    initial_message = HumanMessage(
        content=f"""
        You are a Patient Diagnosis AI, permanently associated with a specific patient via patient_id.  Your responsibilities and behavior are as follows:
        
        1. Permanent Context:
        - You maintain the {patient_id} as your permanent context.
        - You can access patient data and medical history from the database using this ID.

        Look at the series of tools available and make a plan about the next steps for the patient should follow. This plan might include referring the patient to a specialist, determining if more tests are necessary and ordering new blood work, giving the patient a basic diagnosis of health issues surrfaced from tests.

        You have 4 tools: Diagnose Tool, Test Request Tool, Notification Tool, Database Access Tool.

        a) get_data_tool: Returns patient information and medical history. 
        b) diagnose_tool: Analyze medical_history, patient_data, and current medical report data -> produces [conclusion] or <need further help>/<need further test>.
        c) test_tool: Based on diagnose result, determines if additional tests are needed. If yes, requests specific tests.
        d) order_test_tool: Orders specific medical tests for the patient. This must be followed by the notification tool to notify the patient of the tests ordered.
        e) notification_tool: Sends notifications to the patient about results or next steps.

        If a test is needed, you must order a test before calling the notification_tool to inform the patient of the test ordered and next steps. If not, you must finish your process by informing the patient of your findings, or if everything is normal.

        Use them as you see fit to complete this task.
        """
    )

    initial_state = {"messages": [initial_message]}
    
    for event in graph.stream(initial_state):
        for node_name, value in event.items():
            if node_name == "agent":
                last_msg = value["messages"][-1]
                if hasattr(last_msg, 'content') and last_msg.content:
                    print(f"Agent thinking: {last_msg.content[:100]}...")
            elif node_name == "tools":
                print("Agent using tools...")

# Example usage
if __name__ == "__main__":
    process_patient_data("00000000-0000-0000-0000-000000000000")