interface PageTitleProps {
    title: string;
    image: string;
}

export default function PageTitle({ title, image }: PageTitleProps) {
    return (
        <div className="border-gray-900 dark:border-gray-100 border-4 rounded-4xl flex items-center space-x-4 mb-4 p-12">
            {
                image.length != 0 
                    ?<img src={image} alt={title} className="w-16 h-16 rounded-full" /> 
                    : null 
            }
            <h1 className="text-4xl font-bold">{title}</h1>
        </div>
    );
}