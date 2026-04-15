from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
import streamlit as st

from core.services import EVGateway, PROVIDERS
from core.crypto_utils import ASCON_AVAILABLE

APP_ROOT = Path(__file__).resolve().parent

st.set_page_config(page_title='EV Charging Payment Gateway', page_icon='⚡', layout='wide')


def get_gateway() -> EVGateway:
    if 'gateway' not in st.session_state:
        gateway = EVGateway()
        gateway.seed_demo_data()
        st.session_state.gateway = gateway
    return st.session_state.gateway


def refresh_gateway() -> EVGateway:
    gateway = EVGateway()
    st.session_state.gateway = gateway
    return gateway


def render_home(gateway: EVGateway) -> None:
    st.title('⚡ Secure Centralized EV Charging Payment Gateway')
    st.write(
        'A Streamlit version of your EV charging term-project demo with user registration, '
        'franchise registration, station QR generation, payment processing, blockchain logging, '
        'refund handling, ASCON-based kiosk encryption, and a toy RSA quantum-breach page.'
    )

    c1, c2, c3, c4 = st.columns(4)
    c1.metric('Users', len(gateway.users))
    c2.metric('Franchises', len(gateway.franchises))
    c3.metric('Ledger Blocks', len(gateway.blockchain.chain))
    c4.metric('Chain Valid', 'Yes' if gateway.blockchain.verify_chain() else 'No')

    st.info(
        'ASCON available: '
        + ('Yes' if ASCON_AVAILABLE else 'No, fallback cipher will be used until you install the ascon package.')
    )

    st.subheader('Project Modules')
    st.markdown(
        '''
        - **EV Owner:** Register users and inspect VMID / UID values.
        - **Franchise:** Register stations and generate encrypted station QR payloads.
        - **Charging Session:** Simulate the complete payment flow.
        - **Grid Authority:** Inspect balances, audit trail, and blockchain ledger.
        - **Quantum Demo:** Show why a toy RSA exchange can be broken by a Shor-style simulation.
        '''
    )


def provider_zone_inputs(prefix: str):
    provider = st.selectbox('Provider', list(PROVIDERS.keys()), key=f'{prefix}_provider')
    zone = st.selectbox('Zone Code', PROVIDERS[provider], key=f'{prefix}_zone')
    return provider, zone


def render_user_page(gateway: EVGateway) -> None:
    st.header('EV Owner Registration')
    with st.form('user_registration_form', clear_on_submit=True):
        name = st.text_input('Full Name')
        password = st.text_input('Account Password', type='password')
        mobile = st.text_input('Mobile Number')
        pin = st.text_input('Transaction PIN', type='password')
        balance = st.number_input('Initial Balance', min_value=0.0, value=500.0, step=50.0)
        provider, zone = provider_zone_inputs('user')
        submitted = st.form_submit_button('Register User')

        if submitted:
            if not all([name.strip(), password.strip(), mobile.strip(), pin.strip()]):
                st.error('Please fill all fields.')
            else:
                user = gateway.register_user(name.strip(), password, mobile.strip(), pin.strip(), balance, zone, provider)
                st.success('User registered successfully.')
                st.code(f'UID  : {user.uid}\nVMID : {user.vmid}')

    st.subheader('Registered Users')
    rows = gateway.get_user_rows()
    if rows:
        df = pd.DataFrame(rows)
        st.dataframe(df[['name', 'mobile', 'provider', 'zone_code', 'uid', 'vmid', 'balance', 'active']], use_container_width=True)
    else:
        st.caption('No users registered yet.')


def render_franchise_page(gateway: EVGateway) -> None:
    st.header('Franchise Registration and QR Generation')
    with st.form('franchise_registration_form', clear_on_submit=True):
        name = st.text_input('Franchise Name')
        password = st.text_input('Franchise Password', type='password')
        balance = st.number_input('Initial Balance', min_value=0.0, value=1000.0, step=100.0)
        provider, zone = provider_zone_inputs('franchise')
        submitted = st.form_submit_button('Register Franchise')

        if submitted:
            if not all([name.strip(), password.strip()]):
                st.error('Please fill all fields.')
            else:
                franchise = gateway.register_franchise(name.strip(), password, balance, zone, provider)
                st.success('Franchise registered successfully.')
                st.code(f'FID : {franchise.fid}')

    rows = gateway.get_franchise_rows()
    st.subheader('Registered Franchises')
    if rows:
        df = pd.DataFrame(rows)
        st.dataframe(df[['name', 'provider', 'zone_code', 'fid', 'balance', 'active']], use_container_width=True)
    else:
        st.caption('No franchises registered yet.')

    if gateway.franchises:
        st.subheader('Generate Station QR')
        fid = st.selectbox(
            'Select Franchise FID',
            list(gateway.franchises.keys()),
            format_func=lambda x: f"{gateway.franchises[x].name} ({x})",
        )
        if st.button('Generate Encrypted QR Payload'):
            qr_info = gateway.create_station_qr(fid)
            st.success('QR payload generated.')
            st.code(qr_info['payload'])
            if os.path.exists(qr_info['file_path']):
                st.image(qr_info['file_path'], caption=f"QR for {qr_info['franchise_name']}")
                with open(qr_info['file_path'], 'rb') as f:
                    st.download_button('Download QR Image', data=f.read(), file_name=Path(qr_info['file_path']).name, mime='image/png')


def render_charging_page(gateway: EVGateway) -> None:
    st.header('Charging Session')
    franchise_options = list(gateway.franchises.keys())

    default_payload = ''
    if franchise_options:
        default_choice = st.selectbox(
            'Quick-select Franchise',
            franchise_options,
            format_func=lambda x: f"{gateway.franchises[x].name} ({x})",
        )
        if st.button('Use Fresh QR Payload for Selected Franchise'):
            default_payload = gateway.create_station_qr(default_choice)['payload']
            st.session_state['latest_payload'] = default_payload

    payload_value = st.session_state.get('latest_payload', '')
    encrypted_payload = st.text_area('Encrypted Station QR Payload', value=payload_value, height=120)
    vmid = st.text_input('User VMID')
    pin = st.text_input('User PIN', type='password')
    amount = st.number_input('Charging Amount', min_value=1.0, value=150.0, step=10.0)

    if st.button('Process Payment'):
        result = gateway.process_payment(encrypted_payload.strip(), vmid.strip(), pin.strip(), amount)
        if result['ok']:
            st.success(result['message'])
        else:
            st.warning(result['message'])
        st.json(result)


def render_grid_page(gateway: EVGateway) -> None:
    st.header('Grid Authority Dashboard')

    c1, c2, c3 = st.columns(3)
    c1.metric('Total Users', len(gateway.users))
    c2.metric('Total Franchises', len(gateway.franchises))
    c3.metric('Chain Valid', 'Yes' if gateway.blockchain.verify_chain() else 'No')

    st.subheader('User Balances')
    user_rows = gateway.get_user_rows()
    if user_rows:
        st.dataframe(pd.DataFrame(user_rows)[['name', 'vmid', 'balance', 'provider', 'zone_code', 'active']], use_container_width=True)

    st.subheader('Franchise Balances')
    franchise_rows = gateway.get_franchise_rows()
    if franchise_rows:
        st.dataframe(pd.DataFrame(franchise_rows)[['name', 'fid', 'balance', 'provider', 'zone_code', 'active']], use_container_width=True)

    st.subheader('Blockchain Ledger')
    ledger_rows = gateway.get_ledger_rows()
    st.dataframe(pd.DataFrame(ledger_rows), use_container_width=True)

    st.subheader('Audit Log')
    if gateway.audit_log:
        st.dataframe(pd.DataFrame(gateway.audit_log), use_container_width=True)

    st.subheader('Administrative Actions')
    col_a, col_b = st.columns(2)
    with col_a:
        if st.button('Reload Data from Disk'):
            refresh_gateway()
            st.success('Data reloaded.')
            st.rerun()
    with col_b:
        if st.button('Reset Demo Database'):
            gateway.reset()
            gateway.seed_demo_data()
            refresh_gateway()
            st.success('Database reset and demo data seeded again.')
            st.rerun()


def render_quantum_page(gateway: EVGateway) -> None:
    st.header('Quantum Breach Demo')
    st.write(
        'This page uses a toy RSA setup and a Shor-style simulation to illustrate why '
        'classical public-key exchange can become vulnerable to quantum attacks.'
    )

    users = list(gateway.users.values())
    if not users:
        st.info('Register at least one user first.')
        return

    selected_user = st.selectbox('Select User for Demo', users, format_func=lambda u: f'{u.name} ({u.vmid})')
    if st.button('Run Toy Quantum Breach Simulation'):
        result = gateway.quantum_breach_demo(selected_user.vmid, selected_user.pin)
        st.subheader('Demo Output')
        st.json(result)
        st.code(
            '\n'.join(
                [
                    f"Public key: {result['public_key']}",
                    f"Original private key: {result['private_key']}",
                    f"Recovered private key: {result['cracked_private_key']}",
                    f"Recovered factors: p={result['recovered_p']}, q={result['recovered_q']}",
                    f"Recovered period r: {result['period_r']}",
                    f"Encrypted VMID hash: {result['enc_vmid']}",
                    f"Encrypted PIN value: {result['enc_pin']}",
                    f"Stolen VMID hash: {result['stolen_vmid_small']}",
                    f"Stolen PIN value: {result['stolen_pin_small']}",
                ]
            )
        )
        if result['matches_original_private_key']:
            st.error('Toy RSA private key successfully recovered. This is an educational simulation, not real secure RSA.')



def main() -> None:
    gateway = get_gateway()
    page = st.sidebar.radio(
        'Navigate',
        ['Home', 'EV Owner', 'Franchise', 'Charging Session', 'Grid Authority', 'Quantum Demo'],
    )

    st.sidebar.caption('Data file')
    st.sidebar.code(str(gateway.db_path))

    if page == 'Home':
        render_home(gateway)
    elif page == 'EV Owner':
        render_user_page(gateway)
    elif page == 'Franchise':
        render_franchise_page(gateway)
    elif page == 'Charging Session':
        render_charging_page(gateway)
    elif page == 'Grid Authority':
        render_grid_page(gateway)
    elif page == 'Quantum Demo':
        render_quantum_page(gateway)


if __name__ == '__main__':
    main()
