import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gainz Image Upload API',
      version: '1.0.0',
      description: 'API documentation for the Image Upload service of Gainz fitness social network',
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3004',
        description: 'Image Upload Service',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/controllers/*.ts', './src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
