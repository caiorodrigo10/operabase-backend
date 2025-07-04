/**
 * componentMap - Mapeamento de componentes para renderização
 * Mapeia nomes de componentes para seus componentes React correspondentes
 */

// Import de componentes
import { Container } from '../Components/Container';
import { HeroSection } from '../Components/HeroSection';
import { Text } from '../Components/Text';
import { Button } from '../Components/Button';
import { Section } from '../Components/Section';
import { Columns } from '../ColumnsFixed';
import { Image } from '../Components/Image';
import { Video } from '../Components/Video';
import { Spacer } from '../Components/Spacer';
import { Divider } from '../Components/Divider';
import { Form } from '../Components/Form';
import { Testimonial } from '../Components/Testimonial';
import { DefaultComponent } from '../Components/DefaultComponent';
import { Box } from '../Box';
import { Stack } from '../Stack';
import { Masonry } from '../MasonryFixed';
import { Fragment } from '../Fragment';

// Mapeamento principal de componentes
export const componentMap = {
  // Layout básico
  Container,
  
  // Seções
  HeroSection,
  Section,
  
  // Elementos básicos
  Text,
  Button,
  
  // Layout avançado
  Columns,
  
  // Mídia
  Image,
  Video,
  
  // Utilitários
  Spacer,
  Divider,
  
  // Formulários
  Form,
  
  // Testimonial
  Testimonial,
  
  // Widgets Builder.io
  Box,
  Stack,
  Masonry,
  Fragment,
  
  // Fallback para componentes não encontrados
  DefaultComponent
};

// Função auxiliar para obter componente
export function getComponent(name: string) {
  return componentMap[name] || DefaultComponent;
}

// Função auxiliar para verificar se componente existe
export function hasComponent(name: string): boolean {
  return name in componentMap && name !== 'DefaultComponent';
}

// Lista de componentes disponíveis (para toolbox futuro)
export const availableComponents = Object.keys(componentMap).filter(
  name => name !== 'DefaultComponent'
);

// Categorias de componentes (para organização futura)
export const componentCategories = {
  layout: ['HeroSection'],
  content: ['Text'],
  interactive: ['Button']
};

// Função para obter componentes por categoria
export function getComponentsByCategory(category: keyof typeof componentCategories) {
  return componentCategories[category] || [];
}