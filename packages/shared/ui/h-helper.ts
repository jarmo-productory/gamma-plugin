/**
 * Enhanced h() helper function for DOM creation with React-like patterns
 * Bridges vanilla JS components to React patterns for gradual migration
 */

export interface ComponentProps {
  [key: string]: any;
  className?: string;
  style?: Record<string, string | number>;
  children?: (HTMLElement | string)[];
}

export interface EventHandlers {
  [key: string]: (event: Event) => void;
}

/**
 * Creates HTML elements with React-like syntax
 * Supports style objects, event handlers, and nested children
 */
export function h(
  tag: string,
  props: ComponentProps = {},
  children: (HTMLElement | string)[] = []
): HTMLElement {
  const el = document.createElement(tag);
  
  // Apply props
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'style' && typeof value === 'object') {
      // Apply style object
      Object.assign(el.style, value);
    } else if (key === 'className') {
      // Apply CSS classes
      el.className = value;
    } else if (key.startsWith('on') && typeof value === 'function') {
      // Attach event listeners
      const eventName = key.slice(2).toLowerCase();
      el.addEventListener(eventName, value);
    } else if (key === 'children') {
      // Skip children prop (handled separately)
      return;
    } else {
      // Set attributes
      el.setAttribute(key, String(value));
    }
  });
  
  // Append children
  const allChildren = Array.isArray(children) ? children : [children];
  if (props.children) {
    allChildren.push(...(Array.isArray(props.children) ? props.children : [props.children]));
  }
  
  allChildren.forEach(child => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof HTMLElement) {
      el.appendChild(child);
    }
  });
  
  return el;
}

/**
 * React-style component creator for vanilla JS
 * Enables component pattern with state and lifecycle management
 */
export abstract class Component {
  protected element: HTMLElement;
  protected props: ComponentProps;
  protected state: Record<string, any> = {};
  
  constructor(props: ComponentProps = {}) {
    this.props = props;
    this.element = this.render();
  }
  
  abstract render(): HTMLElement;
  
  setState(newState: Partial<Record<string, any>>): void {
    this.state = { ...this.state, ...newState };
    this.update();
  }
  
  update(): void {
    const newElement = this.render();
    if (this.element.parentNode) {
      this.element.parentNode.replaceChild(newElement, this.element);
    }
    this.element = newElement;
  }
  
  mount(container: HTMLElement): void {
    container.appendChild(this.element);
  }
  
  unmount(): void {
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
  
  getElement(): HTMLElement {
    return this.element;
  }
}

/**
 * Factory for creating reusable component functions
 */
export function createComponent<P extends ComponentProps>(
  renderFn: (props: P) => HTMLElement
) {
  return (props: P): HTMLElement => renderFn(props);
}

/**
 * Utility for creating Tailwind-styled elements
 */
export function tw(tag: string, classes: string, props: ComponentProps = {}, children: (HTMLElement | string)[] = []) {
  return h(tag, { ...props, className: classes }, children);
}

/**
 * Button component factory with Gamma design system integration
 */
export const Button = createComponent<ComponentProps & {
  variant?: 'primary' | 'secondary' | 'outline' | 'export' | 'sync-save' | 'sync-load';
  size?: 'sm' | 'md';
  disabled?: boolean;
}>((props) => {
  const { variant = 'primary', size = 'md', disabled = false, children, ...rest } = props;
  
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
  
  const variantClasses = {
    primary: 'gamma-button-primary',
    secondary: 'gamma-button-secondary', 
    outline: 'gamma-button-outline',
    export: 'btn-export',
    'sync-save': 'sync-btn sync-btn-save',
    'sync-load': 'sync-btn sync-btn-load'
  };
  
  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm'
  };
  
  const className = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    props.className
  ].filter(Boolean).join(' ');
  
  return h('button', {
    ...rest,
    className,
    disabled
  }, children || []);
});

/**
 * Card component following Gamma design system
 */
export const Card = createComponent<ComponentProps>((props) => {
  const { children, ...rest } = props;
  return h('div', {
    ...rest,
    className: `gamma-card ${props.className || ''}`
  }, children || []);
});

/**
 * Input component with Gamma styling
 */
export const Input = createComponent<ComponentProps & {
  type?: string;
  placeholder?: string;
}>((props) => {
  const { type = 'text', ...rest } = props;
  return h('input', {
    ...rest,
    type,
    className: `gamma-input ${props.className || ''}`
  });
});