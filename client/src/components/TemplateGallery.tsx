import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  SimpleGrid,
  Heading,
  Text,
  Button,
  Container,
  useToast,
  Image,
  VStack,
  HStack,
  Badge,
} from '@chakra-ui/react';
import axios from 'axios';

interface Template {
  id: number;
  name: string;
  description: string;
  defaultSettings: {
    backgroundColor: string;
    textColor: string;
    buttonColor: string;
    fontFamily: string;
  };
}

const TemplateGallery: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get('/api/templates');
        setTemplates(response.data);
      } catch (error) {
        toast({
          title: 'エラー',
          description: 'テンプレートの読み込みに失敗しました',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    fetchTemplates();
  }, [toast]);

  const handleTemplateSelect = (templateId: number) => {
    navigate(`/create/${templateId}`);
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading as="h1" size="xl" mb={4}>
            バナーテンプレート
          </Heading>
          <Text fontSize="lg" color="gray.600">
            お好みのテンプレートを選択して、カスタマイズを開始しましょう
          </Text>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
          {templates.map((template) => (
            <Box
              key={template.id}
              borderWidth="1px"
              borderRadius="lg"
              overflow="hidden"
              bg="white"
              boxShadow="md"
              transition="transform 0.2s"
              _hover={{ transform: 'scale(1.02)' }}
            >
              <Box
                p={6}
                bg={template.defaultSettings.backgroundColor}
                minH="200px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <VStack spacing={4}>
                  <Text
                    fontSize="xl"
                    fontWeight="bold"
                    color={template.defaultSettings.textColor}
                    fontFamily={template.defaultSettings.fontFamily}
                  >
                    サンプルテキスト
                  </Text>
                  <Button
                    bg={template.defaultSettings.buttonColor}
                    color="white"
                    _hover={{ opacity: 0.8 }}
                  >
                    サンプルボタン
                  </Button>
                </VStack>
              </Box>

              <Box p={6}>
                <VStack align="stretch" spacing={4}>
                  <Heading as="h3" size="md">
                    {template.name}
                  </Heading>
                  <Text color="gray.600">{template.description}</Text>
                  <HStack spacing={2}>
                    <Badge colorScheme="blue">カスタマイズ可能</Badge>
                    <Badge colorScheme="green">レスポンシブ</Badge>
                  </HStack>
                  <Button
                    colorScheme="blue"
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    このテンプレートを使用
                  </Button>
                </VStack>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      </VStack>
    </Container>
  );
};

export default TemplateGallery; 