import React, { useState, useRef, useEffect } from 'react'
import { MoreVertical, Edit, Trash2, Palette, Type, Move, CornerUpLeft, Zap } from 'lucide-react'

const TOKEN_TYPE_ICONS = {
  color: Palette,
  typography: Type,
  spacing: Move,
  'border-radius': CornerUpLeft,
  shadow: Zap
}

const ContextMenu = ({ isOpen, onClose, onEdit, onDelete, position }) => {
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className="absolute bg-[#0f1419] rounded-md border border-[#2d3748] py-1 z-50 min-w-[120px]"
      style={{
        top: position.y,
        left: position.x
      }}
    >
      <button
        onClick={onEdit}
        className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#2d3748] hover:text-white flex items-center space-x-2 transition-colors"
      >
        <Edit className="h-4 w-4" />
        <span>Edit</span>
      </button>
      <button
        onClick={onDelete}
        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 flex items-center space-x-2 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
        <span>Delete</span>
      </button>
    </div>
  )
}

const TokenPreview = ({ token }) => {
  if (token.type === 'color') {
    return (
      <div className="flex items-center space-x-2">
        <div
          className="w-6 h-6 rounded border border-gray-300"
          style={{ backgroundColor: token.value }}
        />
        <span className="text-sm text-gray-600">{token.value}</span>
      </div>
    )
  }
  
  return <span className="text-sm text-gray-600">{token.value}</span>
}

const TokenTable = ({ tokens, onEdit, onDelete }) => {
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    tokenId: null,
    position: { x: 0, y: 0 }
  })

  const handleContextMenu = (e, tokenId) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const tableContainer = e.currentTarget.closest('.relative')
    const containerRect = tableContainer?.getBoundingClientRect() || { left: 0, right: window.innerWidth }
    
    // Calculate position relative to the table container
    const x = rect.right - containerRect.left
    const y = rect.top - containerRect.top
    
    // Check if dropdown would overflow and adjust position
    const dropdownWidth = 120 // min-w-[120px]
    const adjustedX = (x + dropdownWidth > containerRect.width) ? x - dropdownWidth - 20 : x
    
    setContextMenu({
      isOpen: true,
      tokenId,
      position: {
        x: Math.max(10, adjustedX), // Ensure minimum 10px from left edge
        y: y
      }
    })
  }

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, tokenId: null, position: { x: 0, y: 0 } })
  }

  const handleEdit = () => {
    const token = tokens.find(t => t.id === contextMenu.tokenId)
    if (token) {
      onEdit(token)
    }
    closeContextMenu()
  }

  const handleDelete = () => {
    if (contextMenu.tokenId) {
      onDelete(contextMenu.tokenId)
    }
    closeContextMenu()
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center py-12">
        <Palette className="mx-auto h-12 w-12 text-gray-500" />
        <h3 className="mt-2 text-sm font-medium text-white">No tokens</h3>
        <p className="mt-1 text-sm text-gray-400">Get started by creating your first design token.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="overflow-hidden border border-[#2d3748] md:rounded-lg">
        <table className="min-w-full divide-y divide-[#2d3748]">
          <thead className="bg-[#0f1419]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Description
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-[#0f1419] divide-y divide-[#2d3748]">
            {tokens.map((token) => {
              const IconComponent = TOKEN_TYPE_ICONS[token.type] || Palette
              return (
                <tr key={token.id} className="hover:bg-[#2d3748]/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{token.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <IconComponent className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-400 capitalize">{token.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <TokenPreview token={token} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white max-w-xs truncate">
                      {token.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    <button
                      onClick={(e) => handleContextMenu(e, token.id)}
                      className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-[#2d3748]"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ContextMenu
        isOpen={contextMenu.isOpen}
        onClose={closeContextMenu}
        onEdit={handleEdit}
        onDelete={handleDelete}
        position={contextMenu.position}
      />
    </div>
  )
}

export default TokenTable
