import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  Select,
  useToast,
  Container,
  Grid,
  GridItem,
  FormControl,
  FormLabel,
  ColorPicker,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@chakra-ui/react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

interface BannerSettings {
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  fontFamily: string;
  fontSize: number;
}

interface Template {
  id: number;
  name: string;
  description: string;
  defaultSettings: BannerSettings;
}

const BannerCreator: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const toast = useToast();
  const [template, setTemplate] = useState<Template | null>(null);
  const [bannerSize, setBannerSize] = useState('728x90');
  const [image, setImage] = useState<string | null>(null);
  const [settings, setSettings] = useState<BannerSettings>({
    backgroundColor: '#ffffff',
    textColor: '#000000',
    buttonColor: '#ff0000',
    fontFamily: 'Arial',
    fontSize: 16,
  });
  const [text, setText] = useState({
    catchCopy: '',
    bodyCopy: '',
    ctaButton: '詳細を見る',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const response = await axios.get(`/api/templates/${templateId}`);
        setTemplate(response.data);
        setSettings(response.data.defaultSettings);
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

    fetchTemplate();
  }, [templateId, toast]);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('size', bannerSize);

    try {
      const response = await axios.post('/api/upload', formData);
      setImage(response.data.resizedImage);
    } catch (error) {
      toast({
        title: 'エラー',
        description: '画像のアップロードに失敗しました',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const handleGenerateBanner = async () => {
    try {
      const response = await axios.post('/api/generate-banner', {
        templateId,
        size: bannerSize,
        image,
        text,
        settings,
      });

      // 生成されたバナーのダウンロードリンクを表示
      toast({
        title: '成功',
        description: 'バナーが生成されました',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'バナーの生成に失敗しました',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleGenerateImage = async () => {
    if (!prompt) {
      toast({
        title: 'エラー',
        description: 'プロンプトを入力してください',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await axios.post('/api/generate-image', {
        prompt,
        size: bannerSize,
      });
      setImage(response.data.imageUrl);
      toast({
        title: '成功',
        description: '画像が生成されました',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'エラー',
        description: '画像の生成に失敗しました',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Grid templateColumns="repeat(2, 1fr)" gap={8}>
        <GridItem>
          <VStack spacing={6} align="stretch">
            <Box>
              <FormLabel>バナーサイズ</FormLabel>
              <Select value={bannerSize} onChange={(e) => setBannerSize(e.target.value)}>
                <option value="728x90">レクタングル (728x90)</option>
                <option value="300x250">ミディアムレクタングル (300x250)</option>
                <option value="300x600">ハーフページ (300x600)</option>
                <option value="160x600">ワイドスカイスクレイパー (160x600)</option>
                <option value="320x50">モバイルバナー (320x50)</option>
                <option value="970x250">ビルボード (970x250)</option>
              </Select>
            </Box>

            <Box>
              <FormLabel>画像アップロード</FormLabel>
              <Box
                {...getRootProps()}
                p={10}
                border="2px dashed"
                borderColor="gray.300"
                borderRadius="md"
                textAlign="center"
                cursor="pointer"
              >
                <input {...getInputProps()} />
                <Text>画像をドラッグ＆ドロップ、またはクリックして選択</Text>
              </Box>
            </Box>

            <Box>
              <FormLabel>キャッチコピー</FormLabel>
              <Input
                value={text.catchCopy}
                onChange={(e) => setText({ ...text, catchCopy: e.target.value })}
                placeholder="キャッチコピーを入力"
              />
            </Box>

            <Box>
              <FormLabel>ボディコピー</FormLabel>
              <Input
                value={text.bodyCopy}
                onChange={(e) => setText({ ...text, bodyCopy: e.target.value })}
                placeholder="ボディコピーを入力"
              />
            </Box>

            <Box>
              <FormLabel>CTAボタンテキスト</FormLabel>
              <Input
                value={text.ctaButton}
                onChange={(e) => setText({ ...text, ctaButton: e.target.value })}
                placeholder="CTAボタンのテキストを入力"
              />
            </Box>

            <Box>
              <FormLabel>背景色</FormLabel>
              <Input
                type="color"
                value={settings.backgroundColor}
                onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
              />
            </Box>

            <Box>
              <FormLabel>文字色</FormLabel>
              <Input
                type="color"
                value={settings.textColor}
                onChange={(e) => setSettings({ ...settings, textColor: e.target.value })}
              />
            </Box>

            <Box>
              <FormLabel>ボタン色</FormLabel>
              <Input
                type="color"
                value={settings.buttonColor}
                onChange={(e) => setSettings({ ...settings, buttonColor: e.target.value })}
              />
            </Box>

            <Box>
              <FormLabel>フォント</FormLabel>
              <Select
                value={settings.fontFamily}
                onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
              >
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Roboto">Roboto</option>
              </Select>
            </Box>

            <Box>
              <FormLabel>文字サイズ</FormLabel>
              <Slider
                value={settings.fontSize}
                onChange={(value) => setSettings({ ...settings, fontSize: value })}
                min={12}
                max={48}
                step={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <Text>{settings.fontSize}px</Text>
            </Box>

            <Box>
              <FormLabel>AI画像生成</FormLabel>
              <VStack spacing={4}>
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="画像の説明を入力（例：エレガントな背景、高級感のある雰囲気）"
                />
                <Button
                  colorScheme="purple"
                  onClick={handleGenerateImage}
                  isLoading={isGenerating}
                  loadingText="生成中..."
                >
                  AIで画像を生成
                </Button>
              </VStack>
            </Box>

            <Button colorScheme="blue" onClick={handleGenerateBanner}>
              バナーを生成
            </Button>
          </VStack>
        </GridItem>

        <GridItem>
          <Box
            border="1px solid"
            borderColor="gray.200"
            borderRadius="md"
            p={4}
            position="relative"
            style={{
              width: bannerSize.split('x')[0] + 'px',
              height: bannerSize.split('x')[1] + 'px',
              backgroundColor: settings.backgroundColor,
              color: settings.textColor,
              fontFamily: settings.fontFamily,
            }}
          >
            {image && (
              <img
                src={image}
                alt="Banner"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
            <VStack
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              spacing={2}
              textAlign="center"
            >
              <Text fontSize={`${settings.fontSize}px`} fontWeight="bold">
                {text.catchCopy}
              </Text>
              <Text fontSize={`${settings.fontSize * 0.8}px`}>{text.bodyCopy}</Text>
              <Button
                bg={settings.buttonColor}
                color="white"
                _hover={{ opacity: 0.8 }}
                size="sm"
              >
                {text.ctaButton}
              </Button>
            </VStack>
          </Box>
        </GridItem>
      </Grid>
    </Container>
  );
};

export default BannerCreator; 