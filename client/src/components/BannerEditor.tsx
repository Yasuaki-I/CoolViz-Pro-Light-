import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Grid,
  GridItem,
  useToast,
  Container,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
} from '@chakra-ui/react';
import { Stage, Layer as KonvaLayer, Image, Text, Group } from 'react-konva';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import LayerManager, { Layer } from './LayerManager';
import { useImage } from 'react-konva-utils';

interface BannerEditorProps {
  templateId: string;
  bannerSize: { width: number; height: number };
}

interface ErrorState {
  message: string;
  details?: string;
  type: 'error' | 'warning' | 'info';
}

const BannerEditor: React.FC<BannerEditorProps> = ({ templateId, bannerSize }) => {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const stageRef = useRef<any>(null);
  const toast = useToast();

  // エラーハンドリング用のユーティリティ関数
  const handleError = useCallback((error: Error, type: ErrorState['type'] = 'error') => {
    console.error('Error in BannerEditor:', error);
    setError({
      message: error.message,
      details: error.stack,
      type
    });
    
    toast({
      title: 'エラーが発生しました',
      description: error.message,
      status: type,
      duration: 5000,
      isClosable: true,
    });
  }, [toast]);

  const handleLayerUpdate = useCallback((updatedLayers: Layer[]) => {
    try {
      setLayers(updatedLayers);
    } catch (error) {
      handleError(error as Error);
    }
  }, [handleError]);

  const handleLayerSelect = useCallback((layerId: string) => {
    try {
      setSelectedLayerId(layerId);
    } catch (error) {
      handleError(error as Error);
    }
  }, [handleError]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      const file = acceptedFiles[0];
      if (!file) return;

      // ファイルサイズのチェック
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('ファイルサイズは5MB以下にしてください');
      }

      // ファイル形式のチェック
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        throw new Error('JPEG、PNG、GIF形式の画像のみアップロード可能です');
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const newLayer: Layer = {
            id: uuidv4(),
            type: 'image',
            content: img,
            position: { x: 0, y: 0 },
            size: {
              width: img.width,
              height: img.height,
            },
            opacity: 1,
            zIndex: layers.length + 1,
            visible: true,
            locked: false,
            name: file.name,
          };
          setLayers(prevLayers => [...prevLayers, newLayer]);
        };
        img.onerror = () => {
          throw new Error('画像の読み込みに失敗しました');
        };
      };
      reader.onerror = () => {
        throw new Error('ファイルの読み込みに失敗しました');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      handleError(error as Error);
    }
  }, [handleError, layers.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
    },
    maxSize: 5 * 1024 * 1024,
  });

  const handleAddText = useCallback(() => {
    try {
      const newLayer: Layer = {
        id: uuidv4(),
        type: 'text',
        content: {
          text: 'テキストを入力',
          fontSize: 24,
          fontFamily: 'Noto Sans JP',
          fill: '#000000',
        },
        position: { x: 50, y: 50 },
        size: { width: 200, height: 50 },
        opacity: 1,
        zIndex: layers.length + 1,
        visible: true,
        locked: false,
        name: 'テキストレイヤー',
      };
      setLayers(prevLayers => [...prevLayers, newLayer]);
    } catch (error) {
      handleError(error as Error);
    }
  }, [handleError, layers.length]);

  const handleExport = useCallback(() => {
    try {
      if (!stageRef.current) {
        throw new Error('ステージが初期化されていません');
      }

      const dataURL = stageRef.current.toDataURL();
      const link = document.createElement('a');
      link.download = 'banner.png';
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: '成功',
        description: 'バナーをエクスポートしました',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      handleError(error as Error);
    }
  }, [handleError, toast]);

  // レイヤーのメモ化
  const visibleLayers = useMemo(() => {
    return layers
      .filter((layer) => layer.visible)
      .sort((a, b) => a.zIndex - b.zIndex);
  }, [layers]);

  // レイヤーのレンダリング
  const renderLayers = useCallback(() => {
    return visibleLayers.map((layer) => {
      if (layer.type === 'image') {
        return (
          <Image
            key={layer.id}
            image={layer.content}
            x={layer.position.x}
            y={layer.position.y}
            width={layer.size.width}
            height={layer.size.height}
            opacity={layer.opacity}
            draggable={!layer.locked}
          />
        );
      } else if (layer.type === 'text') {
        return (
          <Text
            key={layer.id}
            {...layer.content}
            x={layer.position.x}
            y={layer.position.y}
            opacity={layer.opacity}
            draggable={!layer.locked}
          />
        );
      }
      return null;
    });
  }, [visibleLayers]);

  return (
    <Container maxW="container.xl" py={8}>
      {error && (
        <Alert status={error.type} mb={4}>
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>{error.message}</AlertTitle>
            {error.details && (
              <AlertDescription display="block">
                {error.details}
              </AlertDescription>
            )}
          </Box>
          <CloseButton
            position="absolute"
            right="8px"
            top="8px"
            onClick={() => setError(null)}
          />
        </Alert>
      )}
      <Grid templateColumns="300px 1fr" gap={8}>
        <GridItem>
          <VStack spacing={4} align="stretch">
            <LayerManager
              layers={layers}
              onLayerUpdate={handleLayerUpdate}
              onLayerSelect={handleLayerSelect}
              selectedLayerId={selectedLayerId}
            />
            <Box
              {...getRootProps()}
              p={4}
              border="2px dashed"
              borderRadius="md"
              bg={isDragActive ? 'gray.100' : 'white'}
              transition="background-color 0.2s"
            >
              <input {...getInputProps()} />
              <Box textAlign="center">
                <Text>画像をドラッグ＆ドロップ</Text>
                <Text fontSize="sm" color="gray.500">
                  またはクリックして選択
                </Text>
              </Box>
            </Box>
            <HStack spacing={4}>
              <Box flex={1}>
                <button onClick={handleAddText}>テキスト追加</button>
              </Box>
              <Box flex={1}>
                <button onClick={handleExport}>エクスポート</button>
              </Box>
            </HStack>
          </VStack>
        </GridItem>

        <GridItem>
          <Box
            border="1px solid"
            borderColor="gray.200"
            borderRadius="md"
            p={4}
            bg="white"
          >
            <Stage
              ref={stageRef}
              width={bannerSize.width}
              height={bannerSize.height}
            >
              <KonvaLayer>
                {renderLayers()}
              </KonvaLayer>
            </Stage>
          </Box>
        </GridItem>
      </Grid>
    </Container>
  );
};

export default React.memo(BannerEditor); 