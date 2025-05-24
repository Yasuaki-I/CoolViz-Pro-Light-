import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ChakraProvider, CSSReset } from '@chakra-ui/react';
import BannerCreator from './components/BannerCreator';
import TemplateGallery from './components/TemplateGallery';
import Navbar from './components/Navbar';

const App: React.FC = () => {
  return (
    <ChakraProvider>
      <CSSReset />
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<TemplateGallery />} />
          <Route path="/create/:templateId" element={<BannerCreator />} />
        </Routes>
      </Router>
    </ChakraProvider>
  );
};

export default App; 