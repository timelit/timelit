import Layout from "./Layout.jsx";

import Calendar from "./Calendar";

import AIAssistant from "./AIAssistant";

import Tasks from "./Tasks";

import Preferences from "./Preferences";

import Statistics from "./Statistics";

import OAuthGenerator from "./OAuthGenerator";

import TermsOfService from "./TermsOfService";

import PrivacyPolicy from "./PrivacyPolicy";

import GoogleOAuthInstructions from "./GoogleOAuthInstructions";

import Settings from "./Settings";

import Scheduling from "./Scheduling";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Calendar: Calendar,
    
    AIAssistant: AIAssistant,
    
    Tasks: Tasks,
    
    Preferences: Preferences,
    
    Statistics: Statistics,
    
    OAuthGenerator: OAuthGenerator,
    
    TermsOfService: TermsOfService,
    
    PrivacyPolicy: PrivacyPolicy,
    
    GoogleOAuthInstructions: GoogleOAuthInstructions,
    
    Settings: Settings,

    Scheduling: Scheduling,

}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);

    return (
        <Layout currentPageName={currentPage}>
            <Routes>

                    <Route path="/" element={<Calendar />} />


                <Route path="/Calendar" element={<Calendar />} />

                <Route path="/AIAssistant" element={<AIAssistant />} />

                <Route path="/Tasks" element={<Tasks />} />

                <Route path="/Preferences" element={<Preferences />} />

                <Route path="/Statistics" element={<Statistics />} />

                <Route path="/OAuthGenerator" element={<OAuthGenerator />} />

                <Route path="/TermsOfService" element={<TermsOfService />} />

                <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />

                <Route path="/GoogleOAuthInstructions" element={<GoogleOAuthInstructions />} />

                <Route path="/Settings" element={<Settings />} />

                <Route path="/Scheduling" element={<Scheduling />} />

            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}