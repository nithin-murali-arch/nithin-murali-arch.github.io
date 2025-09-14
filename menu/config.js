const CONFIG = {
    meal_options: {
        'Bread': { 'main': ['Chapati', 'Aloo Paratha', 'Poori'], 'sides': { 'Chapati': ['Paneer Butter Masala', 'Chana Masala', 'Mixed Vegetable Kurma', 'Bhindi Masala', 'Jeera Aloo', 'Kadai Paneer', 'Mutter Paneer', 'Dal Fry', 'Kadai Vegetable'], 'Aloo Paratha': ['Paneer Butter Masala', 'Chana Masala', 'Mixed Vegetable Kurma', 'Bhindi Masala', 'Kadai Paneer', 'Mutter Paneer', 'Dal Fry', 'Kadai Vegetable'], 'Poori': ['Aloo Masala', 'Veg Kurma']}},
        'Pulao': { 'main': ['Vegetable Pulao'], 'sides': ['Paneer Butter Masala', 'Chana Masala', 'Mixed Vegetable Kurma', 'Kadai Paneer', 'Mutter Paneer', 'Kadai Vegetable', 'Onion Raita']},
        'Tiffin': { 'main': ['Rava Kichadi', 'Godhuma Rava Upma', 'Ven Pongal', 'Adai', 'Semiya Upma', 'Arisi Upma', 'Rava Idly'], 'sides': { 'Rava Kichadi': ['Coconut Chutney', 'Sambar'], 'Godhuma Rava Upma': ['Coconut Chutney', 'Tomato Chutney'], 'Ven Pongal': ['Vathakuzhambu and Coconut Chutney', 'Sambar and Coconut Chutney'], 'Adai': ['Avial', 'Coconut Chutney'], 'Semiya Upma': ['Coconut Chutney', 'Tomato Chutney'], 'Arisi Upma': ['Vathakuzhambu and Coconut Chutney'], 'Rava Idly': ['Coriander Chutney', 'Sambar']}},
        'Biryani': { 'main': ['Vegetable Biriyani'], 'sides': ['Cucumber Onion Raita and Potato Roast']},
    },
    // This section contains rules for meal frequency and prep tasks
    monthly_limits: { 
        'Rava Kichadi': 2, 
        'Semiya Upma': 2, 
        'Vegetable Biriyani': 2, 
        'Vegetable Pulao': 2 
    },
    easy_dishes_main: ['Rava Kichadi', 'Godhuma Rava Upma', 'Semiya Upma', 'Arisi Upma', 'Vegetable Pulao'],
    easy_dishes_side: ['Jeera Aloo', 'Dal Fry'],
    prep_tasks: ['Molaga Podi', 'Paruppu Podi', 'Tomato Thokku', 'Pulikachal Paste', 'Kothamalli Thokku', 'Karuvepalai Thokku', 'Sandwich Filling', 'Vathakuzhambu']
};