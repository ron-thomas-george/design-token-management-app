import React, { useState, useEffect } from 'react'
import { X, Palette, Type, Move, CornerUpLeft, Zap } from 'lucide-react'

const TOKEN_TYPES = [
  { value: 'color', label: 'Color', icon: Palette },
  { value: 'typography', label: 'Typography', icon: Type },
  { value: 'spacing', label: 'Spacing', icon: Move },
  { value: 'border-radius', label: 'Border Radius', icon: CornerUpLeft },
  { value: 'shadow', label: 'Shadow', icon: Zap }
]

const TokenDialog = ({ isOpen, onClose, onSave, editToken = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    type: 'color',
    description: ''
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editToken) {
      setFormData(editToken)
    } else {
      setFormData({
        name: '',
        value: '',
        type: 'color',
        description: ''
      })
    }
    setErrors({})
  }, [editToken, isOpen])

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Token name is required'
    }
    
    if (!formData.value.trim()) {
      newErrors.value = 'Token value is required'
    } else {
      // Basic validation based on token type
      if (formData.type === 'color' && !isValidColor(formData.value)) {
        newErrors.value = 'Please enter a valid color (hex, rgb, rgba, hsl, or color name)'
      } else if ((formData.type === 'spacing' || formData.type === 'border-radius') && !isValidSize(formData.value)) {
        newErrors.value = 'Please enter a valid size (e.g., 16px, 1rem, 2em)'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidColor = (value) => {
    // Basic color validation - hex, rgb, rgba, hsl, or named colors
    const colorRegex = /^(#[0-9A-Fa-f]{3,8}|rgb\(.*\)|rgba\(.*\)|hsl\(.*\)|hsla\(.*\)|[a-zA-Z]+)$/
    return colorRegex.test(value.trim())
  }

  const isValidSize = (value) => {
    // Basic size validation - numbers with units
    const sizeRegex = /^\d+(\.\d+)?(px|rem|em|%|vh|vw)$/
    return sizeRegex.test(value.trim())
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) {
      onSave({
        ...formData,
        id: editToken?.id || Date.now().toString(),
        updatedAt: new Date().toISOString()
      })
      onClose()
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const getPlaceholderForType = (type) => {
    switch (type) {
      case 'color':
        return '#3B82F6 or rgb(59, 130, 246)'
      case 'typography':
        return '16px/1.5 "Inter", sans-serif'
      case 'spacing':
        return '16px or 1rem'
      case 'border-radius':
        return '8px or 0.5rem'
      case 'shadow':
        return '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      default:
        return ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#0f1419] rounded-lg border border-[#2d3748] w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-[#2d3748]">
          <h2 className="text-lg font-semibold text-white">
            {editToken ? 'Edit Token' : 'Create New Token'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Token Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
              Token Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md bg-[#0f1419] text-white focus:ring-2 focus:ring-[#3ecf8e] focus:border-[#3ecf8e] ${
                errors.name ? 'border-red-500' : 'border-[#2d3748]'
              }`}
              placeholder="e.g., primary-blue, heading-large, spacing-md"
            />
            {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
          </div>

          {/* Token Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">
              Token Type *
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-[#2d3748] rounded-md bg-[#0f1419] text-white focus:ring-2 focus:ring-[#3ecf8e] focus:border-[#3ecf8e]"
            >
              {TOKEN_TYPES.map((type) => {
                const Icon = type.icon
                return (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Token Value */}
          <div>
            <label htmlFor="value" className="block text-sm font-medium text-gray-300 mb-1">
              Value *
            </label>
            <input
              type="text"
              id="value"
              value={formData.value}
              onChange={(e) => handleChange('value', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md bg-[#0f1419] text-white focus:ring-2 focus:ring-[#3ecf8e] focus:border-[#3ecf8e] ${
                errors.value ? 'border-red-500' : 'border-[#2d3748]'
              }`}
              placeholder={getPlaceholderForType(formData.type)}
            />
            {errors.value && <p className="mt-1 text-sm text-red-400">{errors.value}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-[#2d3748] rounded-md bg-[#0f1419] text-white focus:ring-2 focus:ring-[#3ecf8e] focus:border-[#3ecf8e]"
              placeholder="Detailed information about this token..."
            />
          </div>

          {/* Preview */}
          {formData.value && formData.type === 'color' && isValidColor(formData.value) && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-300">Preview:</span>
              <div
                className="w-8 h-8 rounded border border-[#2d3748]"
                style={{ backgroundColor: formData.value }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 py-4 bg-[#0f1419] border-t border-[#2d3748] rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#2d3748] rounded-md text-sm font-medium text-gray-300 bg-[#0f1419] hover:bg-[#2d3748] hover:text-white focus:ring-2 focus:ring-[#3ecf8e] focus:ring-offset-2 focus:ring-offset-[#0f1419] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#3ecf8e] text-black rounded-md hover:bg-[#2dd4aa] focus:ring-2 focus:ring-[#3ecf8e] focus:ring-offset-2 focus:ring-offset-[#0f1419] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {editToken ? 'Update Token' : 'Create Token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TokenDialog
