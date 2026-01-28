if true then return {} end

return {
  {
    "lervag/vimtex",
    lazy = false,
    init = function()
      vim.g.vimtex_syntax_conceal_disable = 1
      vim.g.vimtex_view_method = 'skim'
    end
  },

  {
    "SirVer/ultisnips",
    lazy = false,
    init = function()
      vim.g.UltiSnipsExpandTrigger = "<tab>"
      vim.g.UltiSnipsJumpForwardTrigger = "<tab>"
      vim.g.UltiSnipsJumpBackwardTrigger = "<s-tab>"
    end
  },

  { "honza/vim-snippets",
    lazy = false,
  },
}
