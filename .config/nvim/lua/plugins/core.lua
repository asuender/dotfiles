return {
    { "olimorris/onedarkpro.nvim" },

    {
        "LazyVim/LazyVim",
        opts = {
            colorscheme = "onedark",
        },
    },

    {
        "folke/snacks.nvim",
        ---@type snacks.Config
        opts = {
            dashboard = {
                sections = {
                    { section = "header" },
                    { section = "keys", gap = 1, padding = 1 },
                    { section = "startup" },
                },
            },
        },
    },
}
